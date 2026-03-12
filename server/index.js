const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3001;

const SUPABASE_URL = 'https://qfkswmskollpngnmsduc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma3N3bXNrb2xscG5nbm1zZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mzg1ODAsImV4cCI6MjA4MDMxNDU4MH0._qH-grGvkp7fqBDpcSNMTIHy4PYNwrc0hn6IVm0-OoA';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma3N3bXNrb2xscG5nbm1zZHVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDczODU4MCwiZXhwIjoyMDgwMzE0NTgwfQ.AdejxM7Y9KcRO0MQkqTnXgxrxx1zSRmpk5K-WZzlL2A';

const KV_TABLE = 'kv_store_2fad19e1';

const getSupabaseClient = (isServiceRole = false) => {
  return createClient(SUPABASE_URL, isServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY);
};

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// KV helpers
const kvGet = async (key) => {
  const supabase = getSupabaseClient(true);
  const { data, error } = await supabase.from(KV_TABLE).select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
};

const kvSet = async (key, value) => {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase.from(KV_TABLE).upsert({ key, value }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
};

const kvGetByPrefix = async (prefix) => {
  const supabase = getSupabaseClient(true);
  const { data, error } = await supabase.from(KV_TABLE).select('key, value').like('key', prefix + '%');
  if (error) throw new Error(error.message);
  return data ?? [];
};

const getUser = async (authHeader) => {
  const accessToken = authHeader?.split(' ')[1];
  if (!accessToken) return null;
  const supabase = getSupabaseClient(true);
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
};

async function trackStudentActivity(email) {
  const streakKey = `student_streak:${email}`;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const streakData = (await kvGet(streakKey)) || { currentStreak: 0, longestStreak: 0, lastActivityDate: null, dates: [] };
  if (streakData.lastActivityDate === today) return streakData;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (streakData.lastActivityDate === yesterdayStr) {
    streakData.currentStreak += 1;
  } else {
    streakData.currentStreak = 1;
  }
  if (streakData.currentStreak > streakData.longestStreak) streakData.longestStreak = streakData.currentStreak;
  streakData.lastActivityDate = today;
  if (!streakData.dates.includes(today)) streakData.dates.push(today);
  await kvSet(streakKey, streakData);
  return streakData;
}

// --- TEACHER ENDPOINTS ---

// Teacher profile (login check)
app.get('/make-server-2fad19e1/teacher/profile', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const role = user.user_metadata?.role;
    if (role === 'student') return res.status(403).json({ error: 'Access denied. Not a teacher account.' });
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Teacher';
    return res.json({
      teacher: {
        id: user.id,
        name,
        email: user.email,
        avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        role: 'teacher',
      }
    });
  } catch (err) {
    console.error('Teacher profile error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Teacher data
app.get('/make-server-2fad19e1/teacher/data', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const students = (await kvGet(`students:${user.id}`)) || [];
    const allClassesEntries = await kvGetByPrefix('classes:');
    const classesMap = new Map();
    for (const entry of allClassesEntries) {
      if (Array.isArray(entry.value)) {
        entry.value.forEach(cls => classesMap.set(cls.id, cls));
      }
    }
    const classes = Array.from(classesMap.values());
    const tasks = (await kvGet(`tasks:${user.id}`)) || [];
    const grades = (await kvGet(`dental_college_grades:${user.id}`)) || [];
    return res.json({ students, classes, tasks, grades });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Save students
app.post('/make-server-2fad19e1/teacher/students', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { students } = req.body;
    await kvSet(`students:${user.id}`, students || []);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Save classes
app.post('/make-server-2fad19e1/teacher/classes', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { classes } = req.body;
    await kvSet(`classes:${user.id}`, classes || []);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/make-server-2fad19e1/teacher/tasks', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const task = req.body;
    if (!task?.title?.trim()) return res.status(400).json({ error: 'Title is required' });
    const newTask = {
      id: task.id || `task-${Date.now()}`,
      title: task.title,
      description: task.description || '',
      maxPoints: task.maxPoints || task.points || 100,
      points: task.points || task.maxPoints || 100,
      dueDate: task.dueDate || task.date || new Date().toISOString().split('T')[0],
      date: task.date || task.dueDate || new Date().toISOString().split('T')[0],
      classId: task.classId || null,
      className: task.className || null,
      subject: task.subject || 'General',
      priority: task.priority || 'Medium',
      type: task.type || 'task',
      status: task.status || 'active',
      createdAt: new Date().toISOString(),
      teacherId: user.id,
    };
    const tasksKey = `tasks:${user.id}`;
    const existingTasks = (await kvGet(tasksKey)) || [];
    const tasksList = Array.isArray(existingTasks) ? existingTasks : [];
    tasksList.push(newTask);
    await kvSet(tasksKey, tasksList);
    if (newTask.classId) {
      try {
        const allStudentsRaw = (await kvGet(`students:${user.id}`)) || [];
        const classStudents = Array.isArray(allStudentsRaw) ? allStudentsRaw.filter(s => s?.classId === newTask.classId && s.email) : [];
        for (const student of classStudents) {
          const key = `student_tasks:${student.email}`;
          const existing = (await kvGet(key)) || [];
          const list = Array.isArray(existing) ? existing : [];
          list.push({ ...newTask, completed: false });
          await kvSet(key, list);
        }
      } catch (e) { console.log('Student assignment error (non-fatal):', e); }
    }
    return res.json(newTask);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Add task of the day
app.post('/make-server-2fad19e1/teacher/add-task', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, description, points, date, class_id, type, subject, priority } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    const task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description || '',
      points: points || 50,
      maxPoints: points || 50,
      type: type || 'task',
      date: date || new Date().toISOString().split('T')[0],
      dueDate: date || new Date().toISOString().split('T')[0],
      classId: class_id || null,
      subject: subject || 'General',
      priority: priority || 'Medium',
      teacherId: user.id,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const tasksKey = `tasks:${user.id}`;
    const tasks = (await kvGet(tasksKey)) || [];
    const tasksList = Array.isArray(tasks) ? tasks : [];
    tasksList.push(task);
    await kvSet(tasksKey, tasksList);
    let assignmentCount = 0;
    try {
      const allStudentsRaw = (await kvGet(`students:${user.id}`)) || [];
      const allStudents = Array.isArray(allStudentsRaw) ? allStudentsRaw : [];
      const eligibleStudents = class_id ? allStudents.filter(s => s?.classId === class_id && s.email) : allStudents.filter(s => s?.email);
      for (const student of eligibleStudents) {
        const key = `student_tasks:${student.email}`;
        const existing = (await kvGet(key)) || [];
        const list = Array.isArray(existing) ? existing : [];
        list.push({ ...task, completed: false, grade: null });
        await kvSet(key, list);
        const notifKey = `notifications:${student.email}`;
        const notifs = (await kvGet(notifKey)) || [];
        const notifsList = Array.isArray(notifs) ? notifs : [];
        notifsList.push({ id: `notif-${Date.now()}-${student.email}`, type: 'task', title: `New Task: ${title}`, message: description || '', createdAt: new Date().toISOString(), read: false, taskId: task.id });
        await kvSet(notifKey, notifsList);
        assignmentCount++;
      }
    } catch (e) { console.log('Error during student assignment:', e); }
    return res.json({ success: true, task, assignedCount: assignmentCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Quest backward compat
app.post('/make-server-2fad19e1/teacher/quest', async (req, res) => {
  req.url = '/make-server-2fad19e1/teacher/add-task';
  app.handle(req, res);
});

// Task students
app.post('/make-server-2fad19e1/teacher/task-students', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskId } = req.body;
    const allStudentsRaw = (await kvGet(`students:${user.id}`)) || [];
    const allStudents = Array.isArray(allStudentsRaw) ? allStudentsRaw : [];
    const tasks = (await kvGet(`tasks:${user.id}`)) || [];
    const task = Array.isArray(tasks) ? tasks.find(t => t.id === taskId) : null;
    const relevantStudents = task?.classId ? allStudents.filter(s => s.classId === task.classId) : allStudents;
    const taskGrades = (await kvGet(`task_grades:${taskId}`)) || {};
    const studentsWithGrades = relevantStudents.map(s => ({ id: s.id, name: s.name, email: s.email, avatar: s.avatar, classId: s.classId, className: s.className, grade: taskGrades[s.email] || null }));
    return res.json({ students: studentsWithGrades });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Task grades
app.get('/make-server-2fad19e1/teacher/task-grades/:taskId', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const grades = (await kvGet(`task_grades:${req.params.taskId}`)) || {};
    return res.json({ grades });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Save grades
app.post('/make-server-2fad19e1/teacher/grades', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskId, studentEmail, grade } = req.body;
    if (!taskId || !studentEmail || !grade) return res.status(400).json({ error: 'Missing required fields' });
    const grades = (await kvGet(`task_grades:${taskId}`)) || {};
    grades[studentEmail] = grade;
    await kvSet(`task_grades:${taskId}`, grades);
    const teacherGradesKey = `dental_college_grades:${user.id}`;
    const teacherGrades = (await kvGet(teacherGradesKey)) || [];
    const teacherGradesList = Array.isArray(teacherGrades) ? teacherGrades : [];
    const studentGradesKey = `student_grades:${studentEmail}`;
    const studentGrades = (await kvGet(studentGradesKey)) || [];
    const studentGradesList = Array.isArray(studentGrades) ? studentGrades : [];
    const tasks = (await kvGet(`tasks:${user.id}`)) || [];
    const task = Array.isArray(tasks) ? tasks.find(t => t.id === taskId) : null;
    const gradeEntry = { studentEmail, subject: task?.subject || 'General', assignment: task?.title || 'Assignment', taskId, task_id: taskId, grade, score: grade, maxScore: 100, date: new Date().toISOString().split('T')[0] };
    const existingTeacherIndex = teacherGradesList.findIndex(g => g.studentEmail === studentEmail && g.taskId === taskId);
    if (existingTeacherIndex >= 0) teacherGradesList[existingTeacherIndex] = gradeEntry;
    else teacherGradesList.push(gradeEntry);
    await kvSet(teacherGradesKey, teacherGradesList);
    const existingStudentIndex = studentGradesList.findIndex(g => g.taskId === taskId);
    if (existingStudentIndex >= 0) studentGradesList[existingStudentIndex] = gradeEntry;
    else studentGradesList.push(gradeEntry);
    await kvSet(studentGradesKey, studentGradesList);
    const studentTasksKey = `student_tasks:${studentEmail}`;
    const studentTasks = (await kvGet(studentTasksKey)) || [];
    const updatedTasks = Array.isArray(studentTasks) ? studentTasks.map(t => t.id === taskId ? { ...t, completed: true, grade } : t) : [];
    await kvSet(studentTasksKey, updatedTasks);
    await trackStudentActivity(studentEmail);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// All registered students
app.get('/make-server-2fad19e1/teacher/all-students', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const supabase = getSupabaseClient(true);
    const { data: authData } = await supabase.auth.admin.listUsers();
    const students = authData?.users?.filter(u => u.user_metadata?.role === 'student') || [];
    const profileEntries = await kvGetByPrefix('student_profile:');
    const profileMap = new Map();
    for (const entry of profileEntries) {
      if (entry.value?.email) profileMap.set(entry.value.email, entry.value);
    }
    const teacherStudents = (await kvGet(`students:${user.id}`)) || [];
    const assignedEmails = new Set(Array.isArray(teacherStudents) ? teacherStudents.map(s => s.email) : []);
    const result = students.map(u => {
      const profile = profileMap.get(u.email) || {};
      const name = u.user_metadata?.name || u.email?.split('@')[0] || 'Student';
      return {
        id: u.id, name, email: u.email,
        avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        currentLevel: profile.currentLevel || 1,
        totalPoints: profile.totalPoints || 0,
        gameProgress: profile.gameProgress || 0,
        lastActive: u.last_sign_in_at || u.created_at,
        status: 'active',
        subjects: profile.subjects || [],
        averageGrade: 0,
        classId: profile.classId || null,
        className: profile.className || null,
        isRegistered: true,
        isAssigned: assignedEmails.has(u.email),
        registeredAt: u.created_at,
      };
    });
    return res.json({ students: result });
  } catch (err) {
    console.error('All students error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Task statistics
app.get('/make-server-2fad19e1/teacher/task-stats', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const tasks = (await kvGet(`tasks:${user.id}`)) || [];
    const tasksList = Array.isArray(tasks) ? tasks : [];
    const allStudentsRaw = (await kvGet(`students:${user.id}`)) || [];
    const allStudents = Array.isArray(allStudentsRaw) ? allStudentsRaw : [];

    const taskStats = {};
    for (const task of tasksList) {
      const relevantStudents = task.classId
        ? allStudents.filter(s => s.classId === task.classId)
        : allStudents;
      const totalStudents = relevantStudents.length;
      let completed = 0;
      let attempted = 0;
      const taskGrades = (await kvGet(`task_grades:${task.id}`)) || {};
      for (const student of relevantStudents) {
        if (taskGrades[student.email]) { completed++; attempted++; }
        else {
          const studentTasks = (await kvGet(`student_tasks:${student.email}`)) || [];
          const studentTask = Array.isArray(studentTasks) ? studentTasks.find(t => t.id === task.id) : null;
          if (studentTask?.completed) { completed++; attempted++; }
        }
      }
      taskStats[task.id] = {
        totalStudents,
        completed,
        attempted,
        completionRate: totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0,
        attemptRate: totalStudents > 0 ? Math.round((attempted / totalStudents) * 100) : 0,
      };
    }

    return res.json({ taskStats });
  } catch (err) {
    console.error('Task stats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Update teacher profile
app.post('/make-server-2fad19e1/teacher/profile/update', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const supabase = getSupabaseClient(true);
    const { error } = await supabase.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, ...req.body } });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- SIGNUP ---

app.post('/make-server-2fad19e1/signup', async (req, res) => {
  try {
    const supabase = getSupabaseClient(true);
    const { email, password, name, role, ...rest } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password and name are required' });
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: role || 'teacher', ...rest },
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/make-server-2fad19e1/student/signup', async (req, res) => {
  try {
    const supabase = getSupabaseClient(true);
    const { email, password, name, ...rest } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password and name are required' });
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'student', ...rest },
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- STUDENT ENDPOINTS ---

// Student profile (login check)
app.get('/make-server-2fad19e1/student/profile', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const role = user.user_metadata?.role;
    if (role === 'teacher') return res.status(403).json({ error: 'Access denied. Not a student account.' });
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
    const profile = (await kvGet(`student_profile:${user.email}`)) || {};
    return res.json({
      student: {
        id: user.id,
        name,
        email: user.email,
        avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        role: 'student',
        currentLevel: profile.currentLevel || 1,
        totalPoints: profile.totalPoints || 0,
        gameProgress: profile.gameProgress || 0,
        classId: profile.classId || null,
        className: profile.className || null,
      }
    });
  } catch (err) {
    console.error('Student profile error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Student data
app.get('/make-server-2fad19e1/student/data', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const allTasks = (await kvGet(`student_tasks:${user.email}`)) || [];
    const allGrades = (await kvGet(`student_grades:${user.email}`)) || [];
    const streakData = (await kvGet(`student_streak:${user.email}`)) || { currentStreak: 0, longestStreak: 0, dates: [] };
    const tasksList = Array.isArray(allTasks) ? allTasks : [];
    const gradesList = Array.isArray(allGrades) ? allGrades : [];
    const tasksWithCompletion = tasksList.map(task => {
      const hasGrade = gradesList.some(g => g.taskId === task.id || g.task_id === task.id);
      return { ...task, completed: task.completed || hasGrade, grade: gradesList.find(g => g.taskId === task.id || g.task_id === task.id)?.grade };
    });
    return res.json({ tasks: tasksWithCompletion, grades: gradesList, streakData, assignedClass: null, adminMessage: null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Student dashboard
app.get('/make-server-2fad19e1/student/dashboard', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const tasks = (await kvGet(`student_tasks:${user.email}`)) || [];
    const streak = (await kvGet(`student_streak:${user.email}`)) || { currentStreak: 0, dates: [] };
    const profile = (await kvGet(`student_profile:${user.email}`)) || { totalPoints: 0, currentLevel: 1 };
    return res.json({ tasks, streak, quest: null, profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Student notifications
app.get('/make-server-2fad19e1/student/notifications', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const notifs = (await kvGet(`notifications:${user.email}`)) || [];
    return res.json({ notifications: notifs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark notification read
app.post('/make-server-2fad19e1/student/notifications/read', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { notificationId } = req.body;
    const key = `notifications:${user.email}`;
    const notifs = (await kvGet(key)) || [];
    const updated = Array.isArray(notifs) ? notifs.map(n => n.id === notificationId ? { ...n, read: true } : n) : [];
    await kvSet(key, updated);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update student profile
app.post('/make-server-2fad19e1/student/profile/update', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const profileKey = `student_profile:${user.email}`;
    const existing = (await kvGet(profileKey)) || {};
    await kvSet(profileKey, { ...existing, ...req.body, email: user.email });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Teacher: get student streak
app.get('/make-server-2fad19e1/teacher/student-streak/:email', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const streakData = (await kvGet(`student_streak:${req.params.email}`)) || { currentStreak: 0, longestStreak: 0, dates: [] };
    return res.json({ streakData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Teacher: get student tasks
app.get('/make-server-2fad19e1/teacher/student-tasks/:email', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const tasks = (await kvGet(`student_tasks:${req.params.email}`)) || [];
    return res.json({ tasks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Teacher: assign student to class
app.post('/make-server-2fad19e1/teacher/assign-student', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { studentId, studentEmail, classId, className } = req.body;
    if (!studentEmail || !classId) return res.status(400).json({ error: 'studentEmail and classId are required' });

    const supabase = getSupabaseClient(true);
    const { data: authData } = await supabase.auth.admin.getUserById(studentId);
    const studentName = authData?.user?.user_metadata?.name || studentEmail.split('@')[0];
    const avatar = studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const studentsKey = `students:${user.id}`;
    const existingStudents = (await kvGet(studentsKey)) || [];
    const studentsList = Array.isArray(existingStudents) ? existingStudents : [];
    const existingIndex = studentsList.findIndex(s => s.email === studentEmail || s.id === studentId);

    const studentEntry = { id: studentId, name: studentName, email: studentEmail, avatar, classId, className, status: 'active', addedAt: new Date().toISOString() };
    if (existingIndex >= 0) {
      studentsList[existingIndex] = { ...studentsList[existingIndex], classId, className };
    } else {
      studentsList.push(studentEntry);
    }
    await kvSet(studentsKey, studentsList);

    const profileKey = `student_profile:${studentEmail}`;
    const existingProfile = (await kvGet(profileKey)) || {};
    await kvSet(profileKey, { ...existingProfile, classId, className, email: studentEmail });

    return res.json({ success: true });
  } catch (err) {
    console.error('Assign student error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Teacher: unassign student
app.post('/make-server-2fad19e1/teacher/unassign-student', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { studentId } = req.body;

    const studentsKey = `students:${user.id}`;
    const existingStudents = (await kvGet(studentsKey)) || [];
    const studentsList = Array.isArray(existingStudents) ? existingStudents : [];
    const student = studentsList.find(s => s.id === studentId);
    const updated = studentsList.filter(s => s.id !== studentId);
    await kvSet(studentsKey, updated);

    if (student?.email) {
      const profileKey = `student_profile:${student.email}`;
      const existingProfile = (await kvGet(profileKey)) || {};
      await kvSet(profileKey, { ...existingProfile, classId: null, className: null });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Teacher: batch student data
app.post('/make-server-2fad19e1/teacher/students-batch-data', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { emails } = req.body;
    if (!Array.isArray(emails)) return res.status(400).json({ error: 'emails array required' });

    const results = {};
    for (const email of emails) {
      const streak = (await kvGet(`student_streak:${email}`)) || { currentStreak: 0, longestStreak: 0, dates: [] };
      const tasks = (await kvGet(`student_tasks:${email}`)) || [];
      const grades = (await kvGet(`student_grades:${email}`)) || [];
      results[email] = { streak, taskCount: Array.isArray(tasks) ? tasks.length : 0, completedCount: Array.isArray(tasks) ? tasks.filter(t => t.completed).length : 0, grades };
    }
    return res.json({ students: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Teacher: save single task grade
app.post('/make-server-2fad19e1/teacher/task-grade', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskId, studentEmail, grade } = req.body;
    if (!taskId || !studentEmail || grade === undefined) return res.status(400).json({ error: 'Missing fields' });

    const grades = (await kvGet(`task_grades:${taskId}`)) || {};
    grades[studentEmail] = grade;
    await kvSet(`task_grades:${taskId}`, grades);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Student: submit quiz
app.post('/make-server-2fad19e1/student/quiz/submit', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskId, score, maxScore, answers } = req.body;

    const gradeEntry = {
      taskId, task_id: taskId,
      studentEmail: user.email,
      subject: 'Quiz',
      assignment: 'Quiz',
      grade: score,
      score,
      maxScore: maxScore || 100,
      date: new Date().toISOString().split('T')[0],
      answers,
    };

    const studentGradesKey = `student_grades:${user.email}`;
    const studentGrades = (await kvGet(studentGradesKey)) || [];
    const gradesList = Array.isArray(studentGrades) ? studentGrades : [];
    const existingIndex = gradesList.findIndex(g => g.taskId === taskId || g.task_id === taskId);
    if (existingIndex >= 0) gradesList[existingIndex] = gradeEntry;
    else gradesList.push(gradeEntry);
    await kvSet(studentGradesKey, gradesList);

    const studentTasksKey = `student_tasks:${user.email}`;
    const studentTasks = (await kvGet(studentTasksKey)) || [];
    const updatedTasks = Array.isArray(studentTasks) ? studentTasks.map(t => t.id === taskId ? { ...t, completed: true, grade: score } : t) : [];
    await kvSet(studentTasksKey, updatedTasks);

    await trackStudentActivity(user.email);

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const notifKey = `notifications:${user.email}`;
    const notifs = (await kvGet(notifKey)) || [];
    const notifsList = Array.isArray(notifs) ? notifs : [];
    notifsList.push({
      id: `notif-${Date.now()}`,
      type: 'grade',
      title: `Quiz Submitted!`,
      message: `You scored ${score}/${maxScore} points (${percentage}%)`,
      createdAt: new Date().toISOString(),
      read: false,
    });
    await kvSet(notifKey, notifsList);

    return res.json({ success: true, percentage });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Quest endpoint (student)
app.get('/make-server-2fad19e1/quest', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const tasks = (await kvGet(`student_tasks:${user.email}`)) || [];
    const tasksList = Array.isArray(tasks) ? tasks : [];
    const pending = tasksList.filter(t => !t.completed);
    return res.json({ quest: pending[0] || null, tasks: tasksList });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Debug students
app.get('/make-server-2fad19e1/debug/students', async (req, res) => {
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const students = (await kvGet(`students:${user.id}`)) || [];
    return res.json({ students, count: Array.isArray(students) ? students.length : 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
