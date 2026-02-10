import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods with proper OPTIONS handling
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Client-Info",
      "apikey",
      "x-client-info",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400,
    credentials: true,
  }),
);

// Explicitly handle OPTIONS requests
app.options("/*", (c) => {
  return c.text("", 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  });
});

// Create Supabase client for auth
const getSupabaseClient = (serviceRole = false) => {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    serviceRole
      ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
      : Deno.env.get("SUPABASE_ANON_KEY") || "",
  );
};

// Helper function to track student activity for streak calculation
const trackStudentActivity = async (studentEmail: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for date comparison
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    const activityKey = `student_activity:${studentEmail}`;

    // Get existing activity log
    const activityLog = (await kv.get(activityKey)) || {
      dates: [],
      currentStreak: 0,
      longestStreak: 0,
    };

    // Add today's date if not already present
    if (!activityLog.dates.includes(todayStr)) {
      activityLog.dates.push(todayStr);

      // Sort dates in descending order (most recent first)
      const sortedDates = activityLog.dates
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      // Calculate current streak
      let currentStreak = 1; // Start with 1 for today
      let expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - 1); // Start checking from yesterday

      for (let i = 1; i < sortedDates.length; i++) {
        const activityDate = new Date(sortedDates[i]);
        activityDate.setHours(0, 0, 0, 0);

        // Check if this date is the expected consecutive day
        if (activityDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1); // Move to next expected date
        } else {
          // Streak broken
          break;
        }
      }

      activityLog.currentStreak = currentStreak;
      activityLog.longestStreak = Math.max(
        activityLog.longestStreak || 0,
        currentStreak,
      );
      activityLog.lastActivityDate = todayStr;

      // Keep only last 365 days of activity
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      activityLog.dates = activityLog.dates.filter(
        (date) => new Date(date) >= oneYearAgo,
      );

      await kv.set(activityKey, activityLog);
      console.log(`Streak updated for ${studentEmail}: ${currentStreak} days`);
    }

    return activityLog;
  } catch (error) {
    console.log("Error tracking student activity:", error);
    return null;
  }
};

// Helper function to get student streak data
const getStudentStreak = async (studentEmail: string) => {
  try {
    const activityKey = `student_activity:${studentEmail}`;
    const activityLog = (await kv.get(activityKey)) || {
      dates: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    };

    // Recalculate streak in case it's outdated
    if (activityLog.dates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      // Sort dates in descending order
      const sortedDates = activityLog.dates
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      // Check if the most recent activity was today or yesterday
      const mostRecentDate = new Date(sortedDates[0]);
      mostRecentDate.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // If most recent activity is older than yesterday, streak is broken
      if (mostRecentDate.getTime() < yesterday.getTime()) {
        activityLog.currentStreak = 0;
        await kv.set(activityKey, activityLog);
        return activityLog;
      }

      // Calculate streak from most recent date backwards
      let currentStreak = 1;
      let expectedDate = new Date(mostRecentDate);
      expectedDate.setDate(expectedDate.getDate() - 1);

      for (let i = 1; i < sortedDates.length; i++) {
        const activityDate = new Date(sortedDates[i]);
        activityDate.setHours(0, 0, 0, 0);

        if (activityDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }

      activityLog.currentStreak = currentStreak;
    }

    return activityLog;
  } catch (error) {
    console.log("Error getting student streak:", error);
    return {
      dates: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    };
  }
};

// Health check endpoint
app.get("/make-server-2fad19e1/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-2fad19e1/signup", async (c) => {
  try {
    const { name, email, password, department, qualification } =
      await c.req.json();

    if (!name || !email || !password || !department) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = getSupabaseClient(true);

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server isn't configured
      user_metadata: { name, department, qualification, role: "teacher" },
    });

    if (error) {
      console.log("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    // Store teacher profile in KV store
    await kv.set(`teacher:${data.user.id}`, {
      id: data.user.id,
      name,
      email,
      department,
      qualification,
      role: "teacher",
      createdAt: new Date().toISOString(),
    });

    // Initialize empty data structures for the teacher
    await kv.set(`classes:${data.user.id}`, []);
    await kv.set(`tasks:${data.user.id}`, []);
    await kv.set(`teacher_students:${data.user.id}`, []); // New: Store student-class assignments

    return c.json({
      user: {
        id: data.user.id,
        name,
        email,
        department,
        qualification,
        role: "teacher",
      },
    });
  } catch (error) {
    console.log("Signup error:", error);
    return c.json({ error: "Signup failed: " + error.message }, 500);
  }
});

// Get teacher profile
app.get("/make-server-2fad19e1/teacher/profile", async (c) => {
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

    const teacher = await kv.get(`teacher:${user.id}`);
    if (!teacher) {
      return c.json({ error: "Teacher profile not found" }, 404);
    }

    return c.json({ teacher });
  } catch (error) {
    console.log("Get teacher profile error:", error);
    return c.json({ error: "Failed to get profile: " + error.message }, 500);
  }
});

// Update teacher profile
app.post("/make-server-2fad19e1/teacher/profile/update", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      console.log("Profile update error: No access token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log("Profile update auth error:", error);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profileData = await c.req.json();
    console.log(
      "Updating profile for teacher:",
      user.email,
      "with data:",
      profileData,
    );

    // Get current teacher profile
    const currentProfile = (await kv.get(`teacher:${user.id}`)) || {};

    // Update profile data
    const updatedProfile = {
      ...currentProfile,
      ...profileData,
      id: user.id,
      email: user.email,
      role: "teacher",
      updatedAt: new Date().toISOString(),
    };

    // Save updated profile
    await kv.set(`teacher:${user.id}`, updatedProfile);
    console.log("Profile updated successfully for teacher:", user.email);

    return c.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.log("Update teacher profile error:", error);
    return c.json({ error: "Failed to update profile: " + error.message }, 500);
  }
});

// Get all data for a teacher (students, classes, tasks)
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
    const classes = (await kv.get(`classes:${user.id}`)) || [];
    const tasks = (await kv.get(`tasks:${user.id}`)) || [];

    return c.json({ students, classes, tasks });
  } catch (error) {
    console.log("Get data error:", error);
    return c.json({ error: "Failed to get data: " + error.message }, 500);
  }
});

// Save students
app.post("/make-server-2fad19e1/teacher/students", async (c) => {
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

    const { students } = await c.req.json();
    await kv.set(`students:${user.id}`, students);

    return c.json({ success: true });
  } catch (error) {
    console.log("Save students error:", error);
    return c.json({ error: "Failed to save students: " + error.message }, 500);
  }
});

// Save grades and create notifications
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

    const { grades } = await c.req.json();

    console.log("=== SAVING GRADES ===");
    console.log("Teacher ID:", user.id);
    console.log("Number of grades:", grades.length);

    // Save grades in a teacher-specific key
    await kv.set(`dental_college_grades:${user.id}`, grades);
    console.log("Grades saved to KV store");

    // Create notifications for students when new grades are added and mark tasks as complete
    for (const grade of grades) {
      if (grade.studentEmail) {
        console.log("Processing grade for student:", grade.studentEmail);

        // Check if this grade is for a task/assignment and mark it complete
        const tasksKey = `student_tasks:${grade.studentEmail}`;
        const studentTasks = (await kv.get(tasksKey)) || [];

        console.log(`\n--- Checking tasks for ${grade.studentEmail} ---`);
        console.log("Assignment name:", grade.assignment);
        console.log("Student has", studentTasks.length, "tasks");

        // Find and mark matching task as completed
        let taskMarkedComplete = false;
        const updatedTasks = studentTasks.map((task) => {
          console.log(
            `  - Task: "${task.title}" | Completed: ${task.completed}`,
          );

          // Match by assignment name (case-insensitive, flexible matching)
          // Try exact match first, then partial match
          const taskTitle = (task.title || "").toLowerCase().trim();
          const assignmentName = (grade.assignment || "").toLowerCase().trim();

          const exactMatch = taskTitle === assignmentName;
          const partialMatch =
            taskTitle.includes(assignmentName) ||
            assignmentName.includes(taskTitle);

          if ((exactMatch || partialMatch) && !task.completed) {
            console.log(
              `    ✓ MATCH FOUND! Marking task "${task.title}" as completed`,
            );
            taskMarkedComplete = true;
            return {
              ...task,
              completed: true,
              completedAt: new Date().toISOString(),
              gradedBy: "teacher",
              grade: grade.grade || null,
            };
          }
          return task;
        });

        if (taskMarkedComplete) {
          await kv.set(tasksKey, updatedTasks);
          console.log("✓ Task successfully marked as completed in backend");
        } else {
          console.log(
            "✗ No matching task found for assignment:",
            grade.assignment,
          );
        }

        // Get student's notifications
        const notificationsKey = `notifications:${grade.studentEmail}`;
        const notifications = (await kv.get(notificationsKey)) || [];

        // Check if notification for this grade already exists
        const existingNotif = notifications.find((n) => n.gradeId === grade.id);

        if (!existingNotif) {
          // Determine grade letter and calculate EXP
          const percentage = (grade.score / grade.maxScore) * 100;
          let expEarned = 0;

          if (grade.grade) {
            // If letter grade exists, calculate EXP based on it
            const gradeMap = {
              "A+": 100,
              A: 95,
              "A-": 90,
              "B+": 85,
              B: 80,
              "B-": 75,
              "C+": 70,
              C: 65,
              "C-": 60,
              D: 50,
              F: 0,
            };
            expEarned = gradeMap[grade.grade] || Math.floor(percentage);
          } else {
            // More precise calculation for numerical scores
            // EXP is directly proportional to the percentage achieved
            const percentage = (grade.score / grade.maxScore) * 100;
            const baseExp = Math.floor(percentage);

            // Bonus EXP for high performance
            let bonus = 0;
            if (percentage >= 95) bonus = 15;
            else if (percentage >= 90) bonus = 10;
            else if (percentage >= 80) bonus = 5;

            expEarned = baseExp + bonus;
          }

          notifications.push({
            id: `notif-${Date.now()}-${Math.random()}`,
            type: "grade",
            title: "New Grade Posted",
            message: `You received ${grade.grade || grade.score + "/" + grade.maxScore} on ${grade.assignment}. +${expEarned} EXP!`,
            createdAt: new Date().toISOString(),
            read: false,
            gradeId: grade.id,
          });

          await kv.set(notificationsKey, notifications);
          console.log("Notification created for:", grade.studentEmail);

          // Update student's total EXP and Level
          const studentProfileKey = `student_profile:${grade.studentEmail}`;
          const studentProfile = (await kv.get(studentProfileKey)) || {};
          const currentEXP = studentProfile.exp || 0;
          const newEXP = currentEXP + expEarned;
          const newLevel = Math.floor(newEXP / 500) + 1;

          await kv.set(studentProfileKey, {
            ...studentProfile,
            exp: newEXP,
            level: newLevel,
            lastUpdated: new Date().toISOString(),
          });
          console.log(
            `EXP updated for ${grade.studentEmail}: +${expEarned} (Total: ${newEXP})`,
          );

          // Track student activity for streak when grade is assigned
          await trackStudentActivity(grade.studentEmail);
        }
      }
    }

    console.log("=== GRADES SAVED SUCCESSFULLY ===");
    return c.json({ success: true });
  } catch (error) {
    console.log("Save grades error:", error);
    return c.json({ error: "Failed to save grades: " + error.message }, 500);
  }
});

// Save classes
app.post("/make-server-2fad19e1/teacher/classes", async (c) => {
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

    const { classes } = await c.req.json();
    await kv.set(`classes:${user.id}`, classes);

    return c.json({ success: true });
  } catch (error) {
    console.log("Save classes error:", error);
    return c.json({ error: "Failed to save classes: " + error.message }, 500);
  }
});

// Save tasks
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

    const { tasks } = await c.req.json();
    await kv.set(`tasks:${user.id}`, tasks);

    console.log("=== TASK DISTRIBUTION DEBUG ===");
    console.log("Saving tasks:", tasks.length);
    console.log("Teacher ID:", user.id);

    // Create notifications for students when tasks are added
    for (const task of tasks) {
      console.log("\n--- Processing task:", task.title);
      console.log("Task classId:", task.classId);
      console.log("Task ID:", task.id);

      // Get students assigned to this teacher
      const teacherStudents =
        (await kv.get(`teacher_students:${user.id}`)) || [];
      console.log("Total teacher student assignments:", teacherStudents.length);
      console.log("All assignments:", JSON.stringify(teacherStudents, null, 2));

      // Get manually added students (legacy support)
      const manualStudents = (await kv.get(`students:${user.id}`)) || [];
      console.log("Total manual students:", manualStudents.length);

      // Find students in this task's class from both sources
      const assignedClassStudents = teacherStudents.filter(
        (ts) => ts.classId === task.classId,
      );
      const manualClassStudents = manualStudents.filter(
        (s) => s.classId === task.classId,
      );

      console.log(
        "Assigned students in this class:",
        assignedClassStudents.length,
      );
      console.log(
        "Assigned students details:",
        JSON.stringify(assignedClassStudents, null, 2),
      );
      console.log("Manual students in this class:", manualClassStudents.length);

      // Handle assigned (registered) students
      for (const assignment of assignedClassStudents) {
        const studentEmail = assignment.studentEmail;

        // Get or create student's task list
        const studentTasksKey = `student_tasks:${studentEmail}`;
        const studentTasks = (await kv.get(studentTasksKey)) || [];

        // Add task if it doesn't exist
        if (!studentTasks.find((t) => t.id === task.id)) {
          studentTasks.push({
            ...task,
            completed: false,
            teacherId: user.id,
          });
          await kv.set(studentTasksKey, studentTasks);
          console.log("Added task to student:", studentEmail);

          // Create notification for student
          const notificationsKey = `notifications:${studentEmail}`;
          const notifications = (await kv.get(notificationsKey)) || [];
          notifications.push({
            id: `notif-${Date.now()}-${Math.random()}`,
            type: "task",
            title: "New Assignment",
            message: `You have been assigned: ${task.title}`,
            createdAt: new Date().toISOString(),
            read: false,
            taskId: task.id,
          });
          await kv.set(notificationsKey, notifications);
          console.log("Created notification for student:", studentEmail);
        }
      }

      // Handle manually added students (legacy support)
      for (const student of manualClassStudents) {
        const studentTasksKey = `student_tasks:${student.email}`;
        const studentTasks = (await kv.get(studentTasksKey)) || [];

        if (!studentTasks.find((t) => t.id === task.id)) {
          studentTasks.push({
            ...task,
            completed: false,
            teacherId: user.id,
          });
          await kv.set(studentTasksKey, studentTasks);

          const notificationsKey = `notifications:${student.email}`;
          const notifications = (await kv.get(notificationsKey)) || [];
          notifications.push({
            id: `notif-${Date.now()}-${Math.random()}`,
            type: "task",
            title: "New Assignment",
            message: `You have been assigned: ${task.title}`,
            createdAt: new Date().toISOString(),
            read: false,
            taskId: task.id,
          });
          await kv.set(notificationsKey, notifications);
        }
      }
    }

    console.log("Tasks saved successfully");
    return c.json({ success: true });
  } catch (error) {
    console.log("Save tasks error:", error);
    return c.json({ error: "Failed to save tasks: " + error.message }, 500);
  }
});

// Student signup endpoint
app.post("/make-server-2fad19e1/student/signup", async (c) => {
  try {
    const { name, username, email, rollNumber, batch, password } =
      await c.req.json();

    console.log("Student signup attempt:", {
      name,
      username,
      email,
      rollNumber,
      batch,
    });

    if (!name || !username || !email || !rollNumber || !batch || !password) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = getSupabaseClient(true);

    // Check if username already exists
    const usernameKey = `username:${username.toLowerCase()}`;
    const existingUsername = await kv.get(usernameKey);
    if (existingUsername) {
      console.log("Username already exists:", username);
      return c.json(
        { error: "Username already taken. Please choose another one." },
        400,
      );
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server isn't configured
      user_metadata: { name, username, rollNumber, batch, role: "student" },
    });

    if (error) {
      console.log("Student signup auth error:", error);
      return c.json({ error: error.message }, 400);
    }

    console.log("Student auth created, user ID:", data.user.id);

    // Store student profile in KV store
    const studentProfile = {
      id: data.user.id,
      name,
      username,
      email,
      rollNumber,
      batch,
      role: "student",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    await kv.set(`student:${data.user.id}`, studentProfile);
    console.log(
      "Student profile saved to KV store with key:",
      `student:${data.user.id}`,
    );

    // Store username mapping for uniqueness check
    await kv.set(usernameKey, data.user.id);

    // Initialize empty data structures for the student
    await kv.set(`student_tasks:${email}`, []);
    await kv.set(`notifications:${email}`, []);

    console.log("Student signup complete:", {
      id: data.user.id,
      name,
      username,
      email,
      rollNumber,
      batch,
    });

    return c.json({
      user: {
        id: data.user.id,
        name,
        username,
        email,
        rollNumber,
        batch,
        role: "student",
      },
    });
  } catch (error) {
    console.log("Student signup error:", error);
    return c.json({ error: "Signup failed: " + error.message }, 500);
  }
});

// Get student profile
app.get("/make-server-2fad19e1/student/profile", async (c) => {
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

    // Check if user is a student
    const userRole = user.user_metadata?.role;
    if (userRole === "teacher") {
      console.log("Teacher attempted to access student profile:", user.email);
      return c.json(
        { error: "Access denied. Teachers cannot access the student portal." },
        403,
      );
    }

    const student = await kv.get(`student:${user.id}`);
    if (!student) {
      return c.json({ error: "Student profile not found" }, 404);
    }

    return c.json({ student });
  } catch (error) {
    console.log("Get student profile error:", error);
    return c.json({ error: "Failed to get profile: " + error.message }, 500);
  }
});

// Update student profile
app.post("/make-server-2fad19e1/student/profile/update", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      console.log("Student profile update error: No access token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log("Student profile update auth error:", error);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profileData = await c.req.json();
    console.log(
      "Updating student profile for:",
      user.email,
      "with data:",
      profileData,
    );

    // Get current student profile
    const currentProfile = (await kv.get(`student:${user.id}`)) || {};

    // Update profile data
    const updatedProfile = {
      ...currentProfile,
      ...profileData,
      id: user.id,
      email: user.email,
      role: "student",
      updatedAt: new Date().toISOString(),
    };

    // Save updated profile
    await kv.set(`student:${user.id}`, updatedProfile);
    console.log("Student profile updated successfully for:", user.email);

    return c.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.log("Update student profile error:", error);
    return c.json({ error: "Failed to update profile: " + error.message }, 500);
  }
});

// Get student data (grades, tasks, notifications)
app.get("/make-server-2fad19e1/student/data", async (c) => {
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

    const student = await kv.get(`student:${user.id}`);
    if (!student) {
      return c.json({ error: "Student not found" }, 404);
    }

    console.log("Loading data for student:", student.email);

    // Get grades from all teachers
    const allGradesKeys = await kv.getByPrefix("dental_college_grades");
    let studentGrades = [];

    // Filter grades that match this student's email
    for (const gradesEntry of allGradesKeys) {
      if (Array.isArray(gradesEntry.value)) {
        const matchingGrades = gradesEntry.value.filter(
          (g) =>
            g.studentEmail &&
            g.studentEmail.toLowerCase() === student.email.toLowerCase(),
        );
        studentGrades = [...studentGrades, ...matchingGrades];
      }
    }

    // Get tasks and notifications
    const tasks = (await kv.get(`student_tasks:${student.email}`)) || [];
    const notifications =
      (await kv.get(`notifications:${student.email}`)) || [];

    // Get admin broadcast message
    const adminMessage = await kv.get("admin_broadcast:current");

    // Find which class this student is assigned to (check all teachers)
    const allTeacherStudentsKeys = await kv.getByPrefix("teacher_students:");
    let assignedClass = null;

    for (const entry of allTeacherStudentsKeys) {
      if (Array.isArray(entry.value)) {
        const assignment = entry.value.find(
          (ts) => ts.studentEmail === student.email,
        );
        if (assignment) {
          assignedClass = {
            classId: assignment.classId,
            className: assignment.className,
            assignedAt: assignment.assignedAt,
          };
          break;
        }
      }
    }

    console.log("Student data loaded:", {
      grades: studentGrades.length,
      tasks: tasks.length,
      notifications: notifications.length,
      assignedClass: assignedClass ? assignedClass.className : "None",
      hasAdminMessage: !!adminMessage,
    });

    // Get streak data
    const streakData = await getStudentStreak(student.email);

    return c.json({
      grades: studentGrades,
      tasks,
      notifications,
      assignedClass,
      adminMessage,
      streakData,
    });
  } catch (error) {
    console.log("Get student data error:", error);
    return c.json({ error: "Failed to get data: " + error.message }, 500);
  }
});

// Mark task as complete
// Student marking a task as attempted
app.post("/make-server-2fad19e1/student/task/:taskId/attempt", async (c) => {
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

    const student = await kv.get(`student:${user.id}`);
    if (!student) {
      return c.json({ error: "Student not found" }, 404);
    }

    const taskId = c.req.param("taskId");
    const tasks = (await kv.get(`student_tasks:${student.email}`)) || [];

    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, attempted: true, attemptedAt: new Date().toISOString() }
        : task,
    );

    await kv.set(`student_tasks:${student.email}`, updatedTasks);

    // Track activity for streak calculation
    await trackStudentActivity(student.email);

    return c.json({ success: true });
  } catch (error) {
    console.log("Attempt task error:", error);
    return c.json({ error: "Failed to mark as attempted: " + error.message }, 500);
  }
});

// Mark notification as read
app.post(
  "/make-server-2fad19e1/student/notification/:notificationId/read",
  async (c) => {
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

      const student = await kv.get(`student:${user.id}`);
      if (!student) {
        return c.json({ error: "Student not found" }, 404);
      }

      const notificationId = c.req.param("notificationId");
      const notifications =
        (await kv.get(`notifications:${student.email}`)) || [];

      const updatedNotifications = notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif,
      );

      await kv.set(`notifications:${student.email}`, updatedNotifications);

      return c.json({ success: true });
    } catch (error) {
      console.log("Mark notification read error:", error);
      return c.json(
        { error: "Failed to mark notification as read: " + error.message },
        500,
      );
    }
  },
);

// Submit quiz
app.post("/make-server-2fad19e1/student/quiz/submit", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      console.log("Quiz submission error: No access token provided");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log("Quiz submission auth error:", error);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const student = await kv.get(`student:${user.id}`);
    if (!student) {
      console.log(
        "Quiz submission error: Student not found for user ID:",
        user.id,
      );
      return c.json({ error: "Student not found" }, 404);
    }

    const submission = await c.req.json();
    console.log(
      "Quiz submission received from student:",
      student.email,
      "Quiz ID:",
      submission.quizId,
    );

    // Get student's tasks to find the quiz and mark it as complete
    const tasks = (await kv.get(`student_tasks:${student.email}`)) || [];
    const quiz = tasks.find((t) => t.id === submission.quizId);

    if (!quiz) {
      console.log("Quiz submission error: Quiz not found:", submission.quizId);
      return c.json({ error: "Quiz not found" }, 404);
    }

    console.log("Found quiz:", quiz.title);

    // Mark quiz as completed
    const updatedTasks = tasks.map((task) =>
      task.id === submission.quizId
        ? {
            ...task,
            completed: true,
            completedAt: new Date().toISOString(),
            submission: submission,
          }
        : task,
    );

    await kv.set(`student_tasks:${student.email}`, updatedTasks);
    console.log("Quiz marked as completed for student:", student.email);

    // Create a grade entry for this quiz
    const gradeEntry = {
      id: `grade-${Date.now()}`,
      studentEmail: student.email,
      studentName: student.name,
      assignment: quiz.title,
      subject: quiz.subject || "Quiz",
      score: submission.pointsEarned,
      maxScore: submission.totalPoints,
      date: new Date().toISOString(),
      feedback: `Quiz completed: ${submission.correctAnswers}/${submission.totalQuestions} correct (${submission.scorePercentage.toFixed(0)}%). Time spent: ${Math.floor(submission.timeSpent / 60)} minutes ${submission.timeSpent % 60} seconds.`,
      createdAt: new Date().toISOString(),
    };

    // Find the teacher who assigned this quiz (from the task's teacher info or class info)
    // For now, we'll add it to all teachers who can see this student
    const allTeacherStudentsKeys = await kv.getByPrefix("teacher_students:");
    let teacherId = null;

    for (const entry of allTeacherStudentsKeys) {
      if (Array.isArray(entry.value)) {
        const assignment = entry.value.find(
          (ts) => ts.studentEmail === student.email,
        );
        if (assignment) {
          teacherId = entry.key.replace("teacher_students:", "");
          break;
        }
      }
    }

    if (teacherId) {
      console.log("Adding quiz grade for teacher:", teacherId);
      const gradesKey = `dental_college_grades:${teacherId}`;
      const grades = (await kv.get(gradesKey)) || [];
      grades.push(gradeEntry);
      await kv.set(gradesKey, grades);
      console.log("Grade entry added successfully");
    } else {
      console.log(
        "Warning: Could not find teacher for student, grade not saved to teacher records",
      );
    }

    // Create a notification for the student
    const notification = {
      id: `notif-${Date.now()}`,
      type: "grade",
      title: `Quiz "${quiz.title}" Submitted!`,
      message: `You scored ${submission.pointsEarned}/${submission.totalPoints} points (${submission.scorePercentage.toFixed(0)}%)`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    const notifications =
      (await kv.get(`notifications:${student.email}`)) || [];
    notifications.unshift(notification);
    await kv.set(`notifications:${student.email}`, notifications);
    console.log("Notification created for quiz submission");

    // Track activity for streak calculation
    await trackStudentActivity(student.email);

    return c.json({
      success: true,
      submission: submission,
      grade: gradeEntry,
    });
  } catch (error) {
    console.log("Submit quiz error:", error);
    return c.json({ error: "Failed to submit quiz: " + error.message }, 500);
  }
});

// Get all registered students (for admin panel)
app.get("/make-server-2fad19e1/teacher/all-students", async (c) => {
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

    // Get teacher's assigned students
    const teacherStudents = (await kv.get(`teacher_students:${user.id}`)) || [];

    // Get all registered students from student portal
    const studentKeys = await kv.getByPrefix("student:");
    console.log("DEBUG: Found student keys:", studentKeys.length);
    const registeredStudents = [];

    for (const entry of studentKeys) {
      const student = entry.value;

      // Skip if student data is invalid
      if (!student || !student.id || !student.name || !student.email) {
        console.log(
          "DEBUG: Skipping invalid student entry:",
          entry.key,
          student,
        );
        continue;
      }

      console.log("DEBUG: Processing student:", student.name, student.email);

      // Check if this student is assigned to this teacher
      const assignment = teacherStudents.find(
        (ts) => ts.studentId === student.id,
      );

      // Get student's grades from all teachers
      const allGradesKeys = await kv.getByPrefix("dental_college_grades");
      let studentGrades = [];

      for (const gradesEntry of allGradesKeys) {
        if (Array.isArray(gradesEntry.value)) {
          const matchingGrades = gradesEntry.value.filter(
            (g) =>
              g.studentEmail &&
              g.studentEmail.toLowerCase() === student.email.toLowerCase(),
          );
          studentGrades = [...studentGrades, ...matchingGrades];
        }
      }

      // Calculate student stats
      const totalEXP = studentGrades.reduce((sum, grade) => {
        return sum + Math.floor((grade.score / grade.maxScore) * 100);
      }, 0);

      const averageGrade =
        studentGrades.length > 0
          ? Math.round(
              studentGrades.reduce(
                (sum, g) => sum + (g.score / g.maxScore) * 100,
                0,
              ) / studentGrades.length,
            )
          : 0;

      // Get student's tasks
      const tasks = (await kv.get(`student_tasks:${student.email}`)) || [];
      const completedTasks = tasks.filter((t) => t.completed).length;

      // Calculate level (every 200 EXP = 1 level)
      const currentLevel = Math.floor(totalEXP / 200) + 1;

      // Calculate game progress (based on completed tasks and grades)
      const gameProgress = Math.min(
        95,
        Math.round((completedTasks * 10 + studentGrades.length * 5) / 2),
      );

      registeredStudents.push({
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        currentLevel,
        totalPoints: totalEXP,
        gameProgress,
        lastActive: student.lastActive || "Recently",
        status: "active",
        subjects: [],
        averageGrade,
        classId: assignment ? assignment.classId : null,
        className: assignment ? assignment.className : "Not assigned",
        isRegistered: true,
        isAssigned: !!assignment,
        registeredAt: student.createdAt,
      });
    }

    console.log(
      "DEBUG: Total registered students to return:",
      registeredStudents.length,
    );
    return c.json({ students: registeredStudents });
  } catch (error) {
    console.log("Get all students error:", error);
    return c.json({ error: "Failed to get students: " + error.message }, 500);
  }
});

// Assign a registered student to a class
app.post("/make-server-2fad19e1/teacher/assign-student", async (c) => {
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

    const { studentId, studentEmail, classId, className } = await c.req.json();

    if (!studentId || !classId || !className) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    console.log("Assigning student:", {
      studentId,
      studentEmail,
      classId,
      className,
      teacherId: user.id,
    });

    // Get teacher's student assignments
    const teacherStudents = (await kv.get(`teacher_students:${user.id}`)) || [];
    console.log(
      "Current teacher students before assignment:",
      teacherStudents.length,
    );

    // Check if student is already assigned
    const existingIndex = teacherStudents.findIndex(
      (ts) => ts.studentId === studentId,
    );

    if (existingIndex >= 0) {
      // Update existing assignment
      teacherStudents[existingIndex] = {
        studentId,
        studentEmail,
        classId,
        className,
        assignedAt: teacherStudents[existingIndex].assignedAt,
        updatedAt: new Date().toISOString(),
      };
      console.log("Updated existing assignment at index:", existingIndex);
    } else {
      // Add new assignment
      teacherStudents.push({
        studentId,
        studentEmail,
        classId,
        className,
        assignedAt: new Date().toISOString(),
      });
      console.log("Added new assignment, total now:", teacherStudents.length);
    }

    await kv.set(`teacher_students:${user.id}`, teacherStudents);
    console.log(
      "Successfully saved teacher_students with",
      teacherStudents.length,
      "assignments",
    );

    return c.json({ success: true });
  } catch (error) {
    console.log("Assign student error:", error);
    return c.json({ error: "Failed to assign student: " + error.message }, 500);
  }
});

// Unassign a student from teacher's classes
app.post("/make-server-2fad19e1/teacher/unassign-student", async (c) => {
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

    const { studentId } = await c.req.json();

    if (!studentId) {
      return c.json({ error: "Missing student ID" }, 400);
    }

    // Get teacher's student assignments
    const teacherStudents = (await kv.get(`teacher_students:${user.id}`)) || [];

    // Remove the student assignment
    const updatedAssignments = teacherStudents.filter(
      (ts) => ts.studentId !== studentId,
    );

    await kv.set(`teacher_students:${user.id}`, updatedAssignments);

    return c.json({ success: true });
  } catch (error) {
    console.log("Unassign student error:", error);
    return c.json(
      { error: "Failed to unassign student: " + error.message },
      500,
    );
  }
});

// Debug endpoint to check all students in KV store
app.get("/make-server-2fad19e1/debug/students", async (c) => {
  try {
    const studentKeys = await kv.getByPrefix("student:");
    console.log("=== DEBUG: All Students in KV Store ===");
    console.log("Total student records:", studentKeys.length);

    const students = studentKeys.map((entry, index) => {
      console.log(`Student ${index + 1}:`, entry.key, entry.value);
      return {
        key: entry.key,
        ...entry.value,
      };
    });

    return c.json({
      count: students.length,
      students: students,
    });
  } catch (error) {
    console.log("Debug students error:", error);
    return c.json({ error: "Failed to get students: " + error.message }, 500);
  }
});

// Debug endpoint to check teacher assignments
app.get(
  "/make-server-2fad19e1/debug/teacher-students/:teacherId",
  async (c) => {
    try {
      const teacherId = c.req.param("teacherId");
      const teacherStudents =
        (await kv.get(`teacher_students:${teacherId}`)) || [];

      console.log("=== DEBUG: Teacher Student Assignments ===");
      console.log("Teacher ID:", teacherId);
      console.log("Total assignments:", teacherStudents.length);
      console.log("Assignments:", teacherStudents);

      return c.json({
        teacherId,
        count: teacherStudents.length,
        assignments: teacherStudents,
      });
    } catch (error) {
      console.log("Debug teacher students error:", error);
      return c.json(
        { error: "Failed to get teacher students: " + error.message },
        500,
      );
    }
  },
);

// Debug endpoint to check student tasks and notifications
app.get("/make-server-2fad19e1/debug/student-data/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const tasks = (await kv.get(`student_tasks:${email}`)) || [];
    const notifications = (await kv.get(`notifications:${email}`)) || [];

    console.log("=== DEBUG: Student Data ===");
    console.log("Email:", email);
    console.log("Tasks:", tasks.length);
    console.log("Notifications:", notifications.length);

    return c.json({
      email,
      tasks,
      notifications,
    });
  } catch (error) {
    console.log("Debug student data error:", error);
    return c.json(
      { error: "Failed to get student data: " + error.message },
      500,
    );
  }
});

// Get task/quiz statistics for teacher
app.get("/make-server-2fad19e1/teacher/task-stats", async (c) => {
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

    console.log("=== FETCHING TASK STATISTICS ===");
    console.log("Teacher ID:", user.id);

    // Get teacher's tasks
    const tasks = (await kv.get(`tasks:${user.id}`)) || [];
    console.log("Total tasks:", tasks.length);

    // Get teacher's assigned students
    const teacherStudents = (await kv.get(`teacher_students:${user.id}`)) || [];
    
    // Get manually added students (legacy)
    const manualStudents = (await kv.get(`students:${user.id}`)) || [];

    // Get ALL teacher grades once for efficient lookup
    const teacherGrades = (await kv.get(`dental_college_grades:${user.id}`)) || [];
    console.log("Total teacher grades loaded:", teacherGrades.length);

    // OPTIMIZATION: Fetch all student tasks at once
    const allStudentTasksData = await kv.getByPrefix("student_tasks:");
    const studentTasksMap = new Map();
    for (const item of allStudentTasksData) {
      if (item && item.key && item.value) {
        const email = item.key.replace("student_tasks:", "").toLowerCase().trim();
        studentTasksMap.set(email, item.value);
      }
    }

    // Calculate statistics for each task
    const taskStats = {};

    for (const task of tasks) {
      console.log(`\n--- Processing task: ${task.title} (ID: ${task.id}) ---`);

      // Find all students in this task's class
      const assignedClassStudents = teacherStudents.filter(ts => ts.classId === task.classId);
      const manualClassStudents = manualStudents.filter(s => s.classId === task.classId);

      // Use a Set of emails to ensure unique counting per student
      const studentEmails = new Set();
      assignedClassStudents.forEach(a => {
        if (a.studentEmail) studentEmails.add(a.studentEmail.toLowerCase().trim());
      });
      manualClassStudents.forEach(m => {
        if (m.email) studentEmails.add(m.email.toLowerCase().trim());
      });

      const totalStudents = studentEmails.size;
      let completedCount = 0;
      let attemptedCount = 0;

      // Load task-specific grades from separate storage if exists
      const specificTaskGrades = await kv.get(`task_grades:${task.id}`) || {};

      for (const email of studentEmails) {
        // 1. Authoritative check: Teacher gradebook
        const hasTeacherGrade = teacherGrades.find(g => 
          g.studentEmail?.toLowerCase().trim() === email && 
          (g.taskId === task.id || 
           g.id === task.id || 
           g.assignmentId === task.id ||
           g.assignment?.toLowerCase().trim() === task.title?.toLowerCase().trim())
        );

        // Check for specific task_grades mapping (legacy)
        const taskGrades = await kv.get(`task_grades:${task.id}`) || {};
        const hasSpecificGrade = taskGrades[email] !== undefined;

        // FINAL AUTHORITATIVE CHECK: Student is only "completed" if they have a TEACHER grade
        if (hasTeacherGrade || hasSpecificGrade) {
          completedCount++;
          attemptedCount++;
        } else {
          // If no grade exists, it's NOT completed for the teacher's bar
          const studentTasks = studentTasksMap.get(email) || [];
          const studentTask = studentTasks.find(t => 
            t.id === task.id || 
            t.title?.toLowerCase().trim() === task.title?.toLowerCase().trim()
          );

          if (studentTask && (studentTask.started || studentTask.attempted || studentTask.submitted)) {
            attemptedCount++;
          }
        }
      }

      // Ensure counts never exceed total students (no overflow)
      const finalCompleted = Math.min(completedCount, totalStudents);
      const finalAttempted = Math.min(Math.max(attemptedCount, finalCompleted), totalStudents);

      taskStats[task.id] = {
        totalStudents,
        completed: finalCompleted,
        attempted: finalAttempted,
        completionRate: totalStudents > 0 ? Math.round((finalCompleted / totalStudents) * 100) : 0,
        attemptRate: totalStudents > 0 ? Math.round((finalAttempted / totalStudents) * 100) : 0
      };
    }

    console.log("=== TASK STATISTICS COMPLETE ===");
    return c.json({ taskStats });
  } catch (error) {
    console.log("Get task stats error:", error);
    return c.json({ error: "Failed to get task stats: " + error.message }, 500);
  }
});

// Get students list for a specific task (assigned/attempted/completed)
app.post("/make-server-2fad19e1/teacher/task-students", async (c) => {
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
    const { taskId, listType } = body;

    console.log("=== FETCHING STUDENTS LIST (OPTIMIZED) ===");
    console.log("Teacher ID:", user.id);
    console.log("Task ID:", taskId);
    console.log("List Type:", listType);

    // Get teacher's tasks
    const tasks = (await kv.get(`tasks:${user.id}`)) || [];
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // Get teacher's assigned students
    const teacherStudents = (await kv.get(`teacher_students:${user.id}`)) || [];

    // Get manually added students (legacy)
    const manualStudents = (await kv.get(`students:${user.id}`)) || [];

    // Find all students in this task's class
    const assignedClassStudents = teacherStudents.filter(
      (ts) => ts.classId === task.classId,
    );
    const manualClassStudents = manualStudents.filter(
      (s) => s.classId === task.classId,
    );

    console.log(
      "Students in class:",
      assignedClassStudents.length + manualClassStudents.length,
    );

    // OPTIMIZATION: Fetch all student tasks at once using getByPrefix
    const allStudentTasksData = await kv.getByPrefix("student_tasks:");

    // Create a map for quick lookup: email -> tasks
    const studentTasksMap = new Map();
    for (const item of allStudentTasksData) {
      if (item && item.key && item.value) {
        const email = item.key.replace("student_tasks:", "");
        studentTasksMap.set(email, item.value);
      }
    }

    console.log("Loaded tasks data for", studentTasksMap.size, "students");

    // Load grades for this task
    const taskGrades = (await kv.get(`task_grades:${taskId}`)) || {};
    console.log(
      "Loaded grades for",
      Object.keys(taskGrades).length,
      "students",
    );
    console.log("Task grades data:", taskGrades);

    const studentsList = [];

    // Process assigned students
    for (const assignment of assignedClassStudents) {
      const studentEmail = assignment.studentEmail;
      const hasGrade = taskGrades[studentEmail] !== undefined;

      let includeStudent = false;

      console.log(
        `Processing ${studentEmail}: hasGrade=${hasGrade}, grade=${taskGrades[studentEmail]}`,
      );

      // Filter based on whether student has a grade or not
      if (listType === "assigned") {
        // Assigned = students WITHOUT grades
        includeStudent = !hasGrade;
      } else if (listType === "attempted") {
        // Attempted = all students (for compatibility)
        includeStudent = true;
      } else if (listType === "completed") {
        // Completed = students WITH grades
        includeStudent = hasGrade;
      }

      if (includeStudent) {
        studentsList.push({
          id: assignment.studentId || studentEmail,
          name: assignment.studentName || studentEmail,
          email: studentEmail,
          rollNumber: assignment.rollNumber || studentEmail,
          grade: taskGrades[studentEmail],
        });
      }
    }

    // Process manual students
    for (const student of manualClassStudents) {
      const hasGrade = taskGrades[student.email] !== undefined;

      let includeStudent = false;

      console.log(
        `Processing manual ${student.email}: hasGrade=${hasGrade}, grade=${taskGrades[student.email]}`,
      );

      // Filter based on whether student has a grade or not
      if (listType === "assigned") {
        // Assigned = students WITHOUT grades
        includeStudent = !hasGrade;
      } else if (listType === "attempted") {
        // Attempted = all students (for compatibility)
        includeStudent = true;
      } else if (listType === "completed") {
        // Completed = students WITH grades
        includeStudent = hasGrade;
      }

      if (includeStudent) {
        studentsList.push({
          id: student.id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber || student.email,
          grade: taskGrades[student.email],
        });
      }
    }

    console.log("Students list count:", studentsList.length);
    console.log("=== STUDENTS LIST COMPLETE ===");
    return c.json({ students: studentsList });
  } catch (error) {
    console.log("Get task students error:", error);
    return c.json(
      { error: "Failed to get task students: " + error.message },
      500,
    );
  }
});

// Daily Quest endpoints
app.get("/make-server-2fad19e1/student/daily-quest", async (c) => {
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

    // Get today's daily quest
    const today = new Date().toDateString();
    const dailyQuest = await kv.get("daily_quest:current");

    if (!dailyQuest) {
      return c.json({ quest: null, hasSeenToday: true });
    }

    // Check if student has seen today's quest
    const seenKey = `daily_quest_seen:${user.id}:${today}`;
    const hasSeen = await kv.get(seenKey);

    return c.json({
      quest: dailyQuest,
      hasSeenToday: !!hasSeen,
    });
  } catch (error) {
    console.log("Get daily quest error:", error);
    return c.json(
      { error: "Failed to get daily quest: " + error.message },
      500,
    );
  }
});

app.post("/make-server-2fad19e1/student/daily-quest/seen", async (c) => {
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

    // Mark daily quest as seen
    const today = new Date().toDateString();
    const seenKey = `daily_quest_seen:${user.id}:${today}`;
    await kv.set(seenKey, true);

    return c.json({ success: true });
  } catch (error) {
    console.log("Mark daily quest seen error:", error);
    return c.json(
      { error: "Failed to mark quest as seen: " + error.message },
      500,
    );
  }
});

// Admin broadcast message endpoints
app.post("/make-server-2fad19e1/admin/broadcast", async (c) => {
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

    // Check if user is teacher/admin
    const userRole = user.user_metadata?.role;
    if (userRole !== "teacher") {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "Message is required" }, 400);
    }

    // Store admin broadcast message
    const broadcastMessage = {
      id: crypto.randomUUID(),
      message,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set("admin_broadcast:current", broadcastMessage);

    console.log("Admin broadcast message created:", broadcastMessage);

    return c.json({ success: true, message: broadcastMessage });
  } catch (error) {
    console.log("Create admin broadcast error:", error);
    return c.json(
      { error: "Failed to create broadcast: " + error.message },
      500,
    );
  }
});

app.delete("/make-server-2fad19e1/admin/broadcast", async (c) => {
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

    // Check if user is teacher/admin
    const userRole = user.user_metadata?.role;
    if (userRole !== "teacher") {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await kv.del("admin_broadcast:current");

    return c.json({ success: true });
  } catch (error) {
    console.log("Delete admin broadcast error:", error);
    return c.json(
      { error: "Failed to delete broadcast: " + error.message },
      500,
    );
  }
});

// Create daily quest endpoint (for teachers)
app.post("/make-server-2fad19e1/teacher/daily-quest", async (c) => {
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

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    if (userRole !== "teacher") {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const { title, description, points, dueDate } = await c.req.json();

    if (!title || !description) {
      return c.json({ error: "Title and description are required" }, 400);
    }

    const dailyQuest = {
      id: crypto.randomUUID(),
      title,
      description,
      points: points || 50,
      dueDate:
        dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set("daily_quest:current", dailyQuest);

    console.log("Daily quest created:", dailyQuest);

    return c.json({ success: true, quest: dailyQuest });
  } catch (error) {
    console.log("Create daily quest error:", error);
    return c.json(
      { error: "Failed to create daily quest: " + error.message },
      500,
    );
  }
});

// Get student tasks by email (for teachers to view)
app.get("/make-server-2fad19e1/teacher/student-tasks/:email", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    console.log("=== GET STUDENT TASKS REQUEST ===");
    console.log("Has Authorization header:", !!c.req.header("Authorization"));
    console.log("Access token exists:", !!accessToken);

    if (!accessToken) {
      console.log("ERROR: No access token provided");
      return c.json({ error: "Unauthorized - No access token provided" }, 401);
    }

    const supabase = getSupabaseClient(true);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    console.log("User fetch result - has user:", !!user);
    console.log("User fetch result - has error:", !!error);
    if (error) {
      console.log("Auth error:", error.message);
    }

    if (error || !user) {
      console.log("ERROR: Failed to authenticate user");
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    console.log("User ID:", user.id);
    console.log("User metadata:", user.user_metadata);
    console.log("User email:", user.email);

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    console.log("User role:", userRole);

    // Allow access if:
    // 1. User has explicit 'teacher' role, OR
    // 2. User has no role (legacy teacher accounts), OR
    // 3. User doesn't have 'student' role (default to teacher)
    const isStudent = userRole === "student";
    const isTeacher = userRole === "teacher" || !userRole || !isStudent;

    console.log("Is student:", isStudent);
    console.log("Is teacher:", isTeacher);

    if (isStudent || !isTeacher) {
      console.log("ERROR: User is not a teacher, role is:", userRole);
      return c.json(
        {
          error: "Unauthorized - Not a teacher",
          details: `User role: ${userRole}, Expected: teacher`,
        },
        403,
      );
    }

    const studentEmail = c.req.param("email");
    console.log("Fetching tasks for student:", studentEmail);

    // Get student tasks from KV store
    const tasks = (await kv.get(`student_tasks:${studentEmail}`)) || [];
    console.log("Found tasks:", tasks.length);
    console.log("=== END GET STUDENT TASKS REQUEST ===");

    return c.json({ tasks });
  } catch (error) {
    console.log("Get student tasks error:", error);
    return c.json(
      { error: "Failed to get student tasks: " + error.message },
      500,
    );
  }
});

// Get student streak data by email (for teachers to view)
app.get("/make-server-2fad19e1/teacher/student-streak/:email", async (c) => {
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

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    const isStudent = userRole === "student";
    const isTeacher = userRole === "teacher" || !userRole || !isStudent;

    if (isStudent || !isTeacher) {
      return c.json({ error: "Unauthorized - Not a teacher" }, 403);
    }

    const studentEmail = c.req.param("email");
    console.log("Fetching streak data for student:", studentEmail);

    // Get streak data
    const streakData = await getStudentStreak(studentEmail);

    return c.json({ streakData });
  } catch (error) {
    console.log("Get student streak error:", error);
    return c.json(
      { error: "Failed to get student streak: " + error.message },
      500,
    );
  }
});

// OPTIMIZED: Get multiple students' data in one call (for ClassView)
app.post("/make-server-2fad19e1/teacher/students-batch-data", async (c) => {
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

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    const isStudent = userRole === "student";
    const isTeacher = userRole === "teacher" || !userRole || !isStudent;

    if (isStudent || !isTeacher) {
      return c.json({ error: "Unauthorized - Not a teacher" }, 403);
    }

    const body = await c.req.json();
    const { studentEmails } = body;

    if (!Array.isArray(studentEmails) || studentEmails.length === 0) {
      return c.json({ error: "Invalid student emails" }, 400);
    }

    console.log("=== FETCHING BATCH STUDENT DATA (OPTIMIZED) ===");
    console.log("Number of students:", studentEmails.length);

    // Fetch all student tasks and activity data at once
    const allStudentTasksData = await kv.getByPrefix("student_tasks:");
    const allStudentActivityData = await kv.getByPrefix("student_activity:");

    // Create maps for quick lookup
    const studentTasksMap = new Map();
    for (const item of allStudentTasksData) {
      if (item && item.key && item.value) {
        const email = item.key.replace("student_tasks:", "");
        studentTasksMap.set(email, item.value);
      }
    }

    const studentActivityMap = new Map();
    for (const item of allStudentActivityData) {
      if (item && item.key && item.value) {
        const email = item.key.replace("student_activity:", "");
        studentActivityMap.set(email, item.value);
      }
    }

    console.log(
      "Loaded data - Tasks:",
      studentTasksMap.size,
      "Activity:",
      studentActivityMap.size,
    );

    // Build response for each student
    const studentsData = {};
    for (const email of studentEmails) {
      const tasks = studentTasksMap.get(email) || [];
      const activity = studentActivityMap.get(email) || {
        dates: [],
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };

      // Recalculate current streak if needed
      if (activity.dates && activity.dates.length > 0) {
        const sortedDates = activity.dates.sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime(),
        );
        let currentStreak = 0;
        let checkDate = new Date();

        for (const dateStr of sortedDates) {
          const activityDate = new Date(dateStr);
          const diffDays = Math.floor(
            (checkDate.getTime() - activityDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (diffDays === currentStreak) {
            currentStreak++;
          } else if (diffDays > currentStreak) {
            break;
          }
        }

        activity.currentStreak = currentStreak;
      }

      studentsData[email] = {
        streakData: activity,
        taskData: {
          completedCount: tasks.filter((t) => t.completed).length,
          totalCount: tasks.length,
        },
      };
    }

    console.log("=== BATCH STUDENT DATA COMPLETE ===");
    return c.json({ studentsData });
  } catch (error) {
    console.log("Get batch student data error:", error);
    return c.json(
      { error: "Failed to get batch student data: " + error.message },
      500,
    );
  }
});

// Get task grades for a specific task
app.get("/make-server-2fad19e1/teacher/task-grades/:taskId", async (c) => {
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

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    const isStudent = userRole === "student";
    const isTeacher = userRole === "teacher" || !userRole || !isStudent;

    if (isStudent || !isTeacher) {
      return c.json({ error: "Unauthorized - Not a teacher" }, 403);
    }

    const taskId = c.req.param("taskId");
    const grades = (await kv.get(`task_grades:${taskId}`)) || {};

    return c.json({ grades });
  } catch (error) {
    console.log("Get task grades error:", error);
    return c.json(
      { error: "Failed to get task grades: " + error.message },
      500,
    );
  }
});

// Save grade for a student on a specific task
app.post("/make-server-2fad19e1/teacher/task-grade", async (c) => {
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

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    const isStudent = userRole === "student";
    const isTeacher = userRole === "teacher" || !userRole || !isStudent;

    if (isStudent || !isTeacher) {
      return c.json({ error: "Unauthorized - Not a teacher" }, 403);
    }

    const body = await c.req.json();
    const { taskId, studentEmail, grade } = body;

    if (!taskId || !studentEmail || !grade) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    console.log("=== SAVING GRADE ===");
    console.log("Saving grade:", { taskId, studentEmail, grade });

    // Get existing grades for this task
    const grades = (await kv.get(`task_grades:${taskId}`)) || {};
    console.log("Existing grades:", grades);

    // Update the grade for this student
    grades[studentEmail] = grade;
    console.log("Updated grades:", grades);

    // Save back to KV store
    await kv.set(`task_grades:${taskId}`, grades);
    console.log("✓ Grade saved to task_grades");

    // Verify the save by reading it back
    const verifyGrades = (await kv.get(`task_grades:${taskId}`)) || {};
    console.log("Verification - grades after save:", verifyGrades);
    console.log("Verification - student grade:", verifyGrades[studentEmail]);

    // Also save to the main grades system for consistency
    // Get teacher's tasks to find task details
    const tasks = (await kv.get(`tasks:${user.id}`)) || [];
    const task = tasks.find((t) => t.id === taskId);

    if (task) {
      // Save to dental_college_grades for the Marks Management view
      const gradesKey = `dental_college_grades:${user.id}`;
      const allGrades = (await kv.get(gradesKey)) || [];

      // Check if grade already exists for this student and task
      const existingGradeIndex = allGrades.findIndex(
        (g) => g.studentEmail === studentEmail && g.taskId === taskId,
      );

      const gradeEntry = {
        studentEmail,
        subject: task.subject || task.className,
        assignment: task.title,
        taskId: taskId,
        grade: grade,
        date: new Date().toISOString().split("T")[0],
        feedback: `Grade for ${task.type === "quiz" ? "Quiz" : "Task"}: ${task.title}`,
      };

      if (existingGradeIndex >= 0) {
        // Update existing grade
        allGrades[existingGradeIndex] = gradeEntry;
      } else {
        // Add new grade
        allGrades.push(gradeEntry);
      }

      await kv.set(gradesKey, allGrades);
    }

    // Mark task as completed for the student
    const tasksKey = `student_tasks:${studentEmail}`;
    const studentTasks = (await kv.get(tasksKey)) || [];

    console.log(`\n--- Marking task complete for ${studentEmail} ---`);
    console.log("Task ID:", taskId);
    console.log("Student has", studentTasks.length, "tasks");

    let taskUpdated = false;
    const updatedTasks = studentTasks.map((t) => {
      if (t.id === taskId) {
        console.log(
          `  ✓ Found task "${t.title}" - marking as completed with grade ${grade}`,
        );
        taskUpdated = true;
        return {
          ...t,
          completed: true,
          completedAt: t.completedAt || new Date().toISOString(),
          gradedBy: "teacher",
          grade: grade,
        };
      }
      return t;
    });

    if (taskUpdated) {
      await kv.set(tasksKey, updatedTasks);
      console.log("✓ Task marked as completed");

      // Send notification to student
      const notificationsKey = `notifications:${studentEmail}`;
      const notifications = (await kv.get(notificationsKey)) || [];

      notifications.push({
        id: `notif-${Date.now()}-${Math.random()}`,
        type: "grade",
        title: "New Grade Posted",
        message: `You received ${grade} on ${task?.title || "assignment"}. Task completed!`,
        createdAt: new Date().toISOString(),
        read: false,
        taskId: taskId,
      });

      await kv.set(notificationsKey, notifications);
      console.log("✓ Notification sent to student");

      // Track student activity for streak
      await trackStudentActivity(studentEmail);
    } else {
      console.log("✗ Task not found or already completed");
    }

    console.log("Grade saved successfully");
    return c.json({ success: true });
  } catch (error) {
    console.log("Save task grade error:", error);
    return c.json({ error: "Failed to save grade: " + error.message }, 500);
  }
});

// Assign quest of the day
app.post("/make-server-2fad19e1/teacher/quest", async (c) => {
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

    // Check if user is teacher
    const userRole = user.user_metadata?.role;
    const isStudent = userRole === "student";
    const isTeacher = userRole === "teacher" || !userRole || !isStudent;

    if (isStudent || !isTeacher) {
      return c.json({ error: "Unauthorized - Not a teacher" }, 403);
    }

    const body = await c.req.json();
    const { title, description, points, date, class_id } = body;

    if (!title || !description) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const quest = {
      id: `quest-${Date.now()}`,
      title,
      description,
      points: points || 50,
      date: date || new Date().toISOString().split("T")[0],
      classId: class_id,
      teacherId: user.id,
      teacherName: user.user_metadata?.name || user.email,
    };

    console.log("Creating quest:", quest);

    // Save quest to KV store
    await kv.set("daily_quest", quest);

    // Create notifications for all students in the class
    const allStudents = await kv.getByPrefix("student_profile:");
    const classStudents = allStudents
      .map((item) => item.value)
      .filter((student) => student && student.classId === class_id);

    console.log(
      `Creating notifications for ${classStudents.length} students in class ${class_id}`,
    );

    // Create a notification for each student in the class
    for (const student of classStudents) {
      const notificationsKey = `notifications:${student.email}`;
      const notifications = (await kv.get(notificationsKey)) || [];

      notifications.push({
        id: `notif-${Date.now()}-${student.email}`,
        type: "quest",
        questId: quest.id,
        title: `New Quest: ${title}`,
        message: description,
        points: quest.points,
        teacherName: quest.teacherName,
        date: quest.date,
        createdAt: new Date().toISOString(),
        read: false,
      });

      await kv.set(notificationsKey, notifications);
    }

    console.log("Quest saved successfully");
    return c.json({ success: true, quest });
  } catch (error) {
    console.log("Create quest error:", error);
    return c.json({ error: "Failed to create quest: " + error.message }, 500);
  }
});

// Get today's quest (for students)
app.get("/make-server-2fad19e1/quest", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Get student email from token
    let studentClassId = null;
    if (accessToken) {
      const supabase = getSupabaseClient(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (user && !error) {
        const studentProfile = await kv.get(`student_profile:${user.email}`);
        if (studentProfile) {
          studentClassId = studentProfile.classId;
        }
      }
    }

    const quest = (await kv.get("daily_quest")) || null;

    // Check if quest is for today
    if (quest && quest.date !== new Date().toISOString().split("T")[0]) {
      return c.json({ quest: null });
    }

    // Filter quest by class if student has a class
    if (
      quest &&
      studentClassId &&
      quest.classId &&
      quest.classId !== studentClassId
    ) {
      return c.json({ quest: null });
    }

    return c.json({ quest });
  } catch (error) {
    console.log("Get quest error:", error);
    return c.json({ error: "Failed to get quest: " + error.message }, 500);
  }
});

// Get student notifications
app.get("/make-server-2fad19e1/student/notifications", async (c) => {
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

    const notificationsKey = `notifications:${user.email}`;
    const notifications = (await kv.get(notificationsKey)) || [];

    return c.json({ notifications });
  } catch (error) {
    console.log("Get notifications error:", error);
    return c.json(
      { error: "Failed to get notifications: " + error.message },
      500,
    );
  }
});

// Mark notification as read
app.post("/make-server-2fad19e1/student/notifications/read", async (c) => {
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
    const { notificationId } = body;

    const notificationsKey = `notifications:${user.email}`;
    const notifications = (await kv.get(notificationsKey)) || [];

    const updatedNotifications = notifications.map((notif) =>
      notif.id === notificationId ? { ...notif, read: true } : notif,
    );

    await kv.set(notificationsKey, updatedNotifications);

    return c.json({ success: true });
  } catch (error) {
    console.log("Mark notification as read error:", error);
    return c.json(
      { error: "Failed to mark notification as read: " + error.message },
      500,
    );
  }
});

Deno.serve(app.fetch);
