studentEmail, grade } = body;

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
