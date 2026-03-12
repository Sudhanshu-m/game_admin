import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { cors } from "https://deno.land/x/hono@v3.4.1/middleware.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const app = new Hono();

// KV store for dental college management
const kv = await Deno.openKv();

// Helper to get Supabase client
const getSupabaseClient = (isServiceRole = false) => {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = isServiceRole
    ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    : Deno.env.get("SUPABASE_ANON_KEY") || "";
  return createClient(url, key);
};

// CORS configuration - MUST BE FIRST
app.use("*", async (c, next) => {
  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  await next();
});

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-client-info"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

// --- SHARED UTILS ---

async function trackStudentActivity(email: string) {
  const streakKey = `student_streak:${email}`;
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const streakData = (await kv.get(streakKey)) || {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    dates: [],
  };

  if (streakData.lastActivityDate === today) {
    return streakData;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (streakData.lastActivityDate === yesterdayStr) {
    streakData.currentStreak += 1;
  } else {
    streakData.currentStreak = 1;
  }

  if (streakData.currentStreak > streakData.longestStreak) {
    streakData.longestStreak = streakData.currentStreak;
  }

  streakData.lastActivityDate = today;
  if (!streakData.dates.includes(today)) {
    streakData.dates.push(today);
  }

  await kv.set(streakKey, streakData);
  return streakData;
}

// --- TEACHER ENDPOINTS ---

// Get all data for teacher dashboard
app.get("/make-server-2fad19e1/teacher/data", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const students = (await kv.get(`students:${user.id}`)) || [];
    
    // Fetch all classes from all teachers to make them shared
    const allClassesResponse = await kv.getByPrefix({ prefix: ["classes:"] });
    const classesMap = new Map();
    for await (const entry of allClassesResponse) {
      if (Array.isArray(entry.value)) {
        entry.value.forEach(cls => {
          classesMap.set(cls.id, cls);
        });
      }
    }
    const classes = Array.from(classesMap.values());
    
    const tasks = (await kv.get(`tasks:${user.id}`)) || [];
    const gradesKey = `dental_college_grades:${user.id}`;
    const grades = (await kv.get(gradesKey)) || [];

    return c.json({
      students,
      classes,
      tasks,
      grades,
    });
  } catch (error) {
    console.log("Teacher data error:", error);
    return c.json({ error: "Failed to get teacher data: " + error.message }, 500);
  }
});

// Create a new task/quiz
app.post("/make-server-2fad19e1/teacher/tasks", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const task = await c.req.json();
    if (!task || typeof task !== "object" || !task.title || typeof task.title !== "string" || !task.title.trim()) {
      return c.json({ error: "Invalid task payload — title is required" }, 400);
    }

    const newTask = {
      id: task.id || `task-${Date.now()}`,
      title: task.title || "",
      description: task.description || "",
      maxPoints: task.maxPoints || task.points || 100,
      points: task.points || task.maxPoints || 100,
      dueDate: task.dueDate || task.date || new Date().toISOString().split("T")[0],
      date: task.date || task.dueDate || new Date().toISOString().split("T")[0],
      classId: task.classId || null,
      className: task.className || null,
      subject: task.subject || "General",
      priority: task.priority || "Medium",
      type: task.type || "task",
      status: task.status || "active",
      createdAt: new Date().toISOString(),
      teacherId: user.id,
    };

    // Save to teacher's tasks list
    const tasksKey = `tasks:${user.id}`;
    const existingTasks = await kv.get(tasksKey);
    const tasksList: any[] = Array.isArray(existingTasks) ? existingTasks : [];
    tasksList.push(newTask);
    await kv.set(tasksKey, tasksList);

    // Assign to students in the class
    if (newTask.classId) {
      try {
        const studentsKey = `students:${user.id}`;
        const allStudentsRaw = await kv.get(studentsKey);
        const allStudents: any[] = Array.isArray(allStudentsRaw) ? allStudentsRaw : [];
        const classStudents = allStudents.filter(
          (s) => s && s.classId === newTask.classId && s.email,
        );

        for (const student of classStudents) {
          const studentTasksKey = `student_tasks:${student.email}`;
          const existingStudentTasks = await kv.get(studentTasksKey);
          const studentTasks: any[] = Array.isArray(existingStudentTasks) ? existingStudentTasks : [];
          studentTasks.push({ ...newTask, completed: false });
          await kv.set(studentTasksKey, studentTasks);
        }
      } catch (assignError) {
        console.log("Student assignment error (non-fatal):", assignError);
      }
    }

    return c.json(newTask);
  } catch (error) {
    console.log("Create task error:", error);
    return c.json({ error: "Failed to create task: " + error.message }, 500);
  }
});

// Save grade for a student's task
app.post("/make-server-2fad19e1/teacher/grades", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { taskId, studentEmail, grade } = body;

    if (!taskId || !studentEmail || !grade) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Get existing grades for this task
    const grades = (await kv.get(`task_grades:${taskId}`)) || {};
    grades[studentEmail] = grade;
    await kv.set(`task_grades:${taskId}`, grades);

    // Save to teacher's grades log
    const teacherGradesKey = `dental_college_grades:${user.id}`;
    const teacherGrades = (await kv.get(teacherGradesKey)) || [];
    
    // Also save to student's personal grades for quick access
    const studentGradesKey = `student_grades:${studentEmail}`;
    const studentGrades = (await kv.get(studentGradesKey)) || [];
    
    const tasks = (await kv.get(`tasks:${user.id}`)) || [];
    const task = tasks.find((t) => t.id === taskId);
    
    const gradeEntry = {
      studentEmail,
      subject: task?.subject || "General",
      assignment: task?.title || "Assignment",
      taskId: taskId,
      task_id: taskId,
      grade: grade,
      score: grade,
      maxScore: 100,
      date: new Date().toISOString().split("T")[0],
    };

    const existingTeacherIndex = teacherGrades.findIndex(g => g.studentEmail === studentEmail && g.taskId === taskId);
    if (existingTeacherIndex >= 0) {
      teacherGrades[existingTeacherIndex] = gradeEntry;
    } else {
      teacherGrades.push(gradeEntry);
    }
    await kv.set(teacherGradesKey, teacherGrades);

    const existingStudentIndex = studentGrades.findIndex(g => g.taskId === taskId);
    if (existingStudentIndex >= 0) {
      studentGrades[existingStudentIndex] = gradeEntry;
    } else {
      studentGrades.push(gradeEntry);
    }
    await kv.set(studentGradesKey, studentGrades);

    // Update student's task status to mark as completed
    const studentTasksKey = `student_tasks:${studentEmail}`;
    const studentTasks = (await kv.get(studentTasksKey)) || [];
    const updatedTasks = studentTasks.map(t => 
      t.id === taskId ? { ...t, completed: true, grade } : t
    );
    await kv.set(studentTasksKey, updatedTasks);

    // Track activity for streak
    await trackStudentActivity(studentEmail);

    return c.json({ success: true });
  } catch (error) {
    console.log("Save grade error:", error);
    return c.json({ error: "Failed to save grade: " + error.message }, 500);
  }
});

// Add task of the day - makes it appear in Tasks & Quizzes and student dashboards
app.post("/make-server-2fad19e1/teacher/add-task", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);

    const supabase = getSupabaseClient(true);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    console.log("Create task request body:", body);
    const { title, description, points, date, class_id, type, subject, priority } = body;

    const task = {
      id: `task-${Date.now()}`,
      title,
      description,
      points: points || 50,
      maxPoints: points || 50,
      type: type || "task",
      date: date || new Date().toISOString().split("T")[0],
      dueDate: date || new Date().toISOString().split("T")[0],
      classId: class_id,
      subject: subject || "General",
      priority: (priority || "Medium").toLowerCase(),
      teacherId: user.id,
      createdAt: new Date().toISOString(),
      status: "active"
    };

    // Add to teacher's tasks list
    const tasksKey = `tasks:${user.id}`;
    const tasks = (await kv.get(tasksKey)) || [];
    tasks.push(task);
    await kv.set(tasksKey, tasks);
    console.log("Task added to teacher list:", task.id);

    // Assign to students in the class (or all if no class specified)
    let assignmentCount = 0;
    try {
      const allProfiles = kv.list({ prefix: ["student_profile:"] });
      for await (const entry of allProfiles) {
        const student = entry.value;
        // If class_id is specified, only assign to students in that class
        // If class_id is null/undefined, assign to ALL students
        const shouldAssign = !class_id || student?.classId === class_id;
        
        if (student && shouldAssign) {
          const studentTasksKey = `student_tasks:${student.email}`;
          const studentTasks = (await kv.get(studentTasksKey)) || [];
          studentTasks.push({
            ...task,
            completed: false,
            grade: null,
          });
          await kv.set(studentTasksKey, studentTasks);

          // Notify student
          const notifKey = `notifications:${student.email}`;
          const notifs = (await kv.get(notifKey)) || [];
          notifs.push({
            id: `notif-${Date.now()}-${student.email}`,
            type: "task",
            title: `New Task: ${title}`,
            message: description,
            createdAt: new Date().toISOString(),
            read: false,
            taskId: task.id
          });
          await kv.set(notifKey, notifs);
          assignmentCount++;
        }
      }
    } catch (e) {
      console.log("Error during student assignment loop:", e);
    }
    
    console.log(`Assigned task to ${assignmentCount} students${class_id ? ' in class ' + class_id : ' (all students)'}`);

    return c.json({ success: true, task, assignedCount: assignmentCount });
  } catch (error) {
    console.log("Add task error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Keep quest endpoint for backward compatibility
app.post("/make-server-2fad19e1/teacher/quest", async (c) => {
  return c.redirect(307, "/make-server-2fad19e1/teacher/add-task");
});

// --- STUDENT ENDPOINTS ---

// Get student data with tasks, grades, and streak
app.get("/make-server-2fad19e1/student/data", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);

    const supabase = getSupabaseClient(true);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return c.json({ error: "Unauthorized" }, 401);

    // Get all data for the student
    const allTasks = (await kv.get(`student_tasks:${user.email}`)) || [];
    const gradesKey = `student_grades:${user.email}`;
    const allGrades = (await kv.get(gradesKey)) || [];
    const streakData = (await kv.get(`student_streak:${user.email}`)) || { currentStreak: 0, longestStreak: 0, dates: [] };
    
    // Mark tasks as completed if they have grades
    const tasksWithCompletion = allTasks.map(task => {
      const hasGrade = allGrades.some(grade => grade.taskId === task.id || grade.task_id === task.id);
      return {
        ...task,
        completed: task.completed || hasGrade,
        grade: allGrades.find(g => g.taskId === task.id || g.task_id === task.id)?.grade
      };
    });

    return c.json({
      tasks: tasksWithCompletion,
      grades: allGrades,
      streakData,
      assignedClass: null,
      adminMessage: null
    });
  } catch (error) {
    console.log("Student data error:", error);
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-2fad19e1/student/dashboard", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);

    const supabase = getSupabaseClient(true);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return c.json({ error: "Unauthorized" }, 401);

    const tasks = (await kv.get(`student_tasks:${user.email}`)) || [];
    const streak = (await kv.get(`student_streak:${user.email}`)) || { currentStreak: 0, dates: [] };
    const quest = (await kv.get("daily_quest")) || null;
    const profile = (await kv.get(`student_profile:${user.email}`)) || { totalPoints: 0, currentLevel: 1 };

    return c.json({ tasks, streak, quest, profile });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-2fad19e1/student/notifications", async (c) => {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = getSupabaseClient(true);
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const notifs = (await kv.get(`notifications:${user.email}`)) || [];
  return c.json({ notifications: notifs });
});

app.post("/make-server-2fad19e1/student/notifications/read", async (c) => {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = getSupabaseClient(true);
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  const { notificationId } = await c.req.json();

  const key = `notifications:${user.email}`;
  const notifs = (await kv.get(key)) || [];
  const updated = notifs.map(n => n.id === notificationId ? { ...n, read: true } : n);
  await kv.set(key, updated);
  return c.json({ success: true });
});

// --- DEPLOYMENT ---
Deno.serve(app.fetch);
