import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { TakeQuiz } from './TakeQuiz';
import { NotificationsDropdown } from './NotificationsDropdown';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  BookOpen, 
  Target, 
  Award,
  Bell,
  LogOut,
  Zap,
  BarChart3,
  ListTodo,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flame,
  Home,
  GraduationCap,
  FileText,
  Settings,
  User,
  Menu,
  X,
  Sparkles,
  MessageSquare,
  Info,
  Upload,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function StudentDashboard({ student, onLogout, accessToken, projectId }) {
  const [grades, setGrades] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignedClass, setAssignedClass] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [dailyQuest, setDailyQuest] = useState(null);
  const [showDailyQuestDialog, setShowDailyQuestDialog] = useState(false);
  const [adminMessage, setAdminMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileData, setProfileData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    username: student?.username || '',
    rollNumber: student?.rollNumber || '',
    batch: student?.batch || '',
    phone: '',
    department: '',
    semester: ''
  });
  const [stats, setStats] = useState({
    totalEXP: 0,
    level: 1,
    currentLevelEXP: 0,
    nextLevelEXP: 100,
    streak: 0,
    totalAssignments: 0,
    completedAssignments: 0
  });

  useEffect(() => {
    loadStudentData();
    checkDailyQuest();
    loadNotifications();
  }, []);

  const loadStudentData = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/student/data`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Student data loaded:', data);
        setGrades(data.grades || []);
        setTasks(data.tasks || []);
        setAssignedClass(data.assignedClass || null);
        setAdminMessage(data.adminMessage || null);
        calculateStats(data.grades || [], data.tasks || [], data.streakData || { currentStreak: 0, longestStreak: 0 });
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      toast.error('Failed to load data');
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/student/notifications`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Notifications loaded:', data.notifications);
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const checkDailyQuest = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/quest`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Daily quest data:', data);
        if (data.quest) {
          setDailyQuest(data.quest);
        }
      }
    } catch (error) {
      console.error('Error checking daily quest:', error);
    }
  };

  const calculateStats = (gradesData, tasksData, streakData) => {
    // Calculate total EXP from grades
    const totalEXP = gradesData.reduce((sum, grade) => {
      // Check if grade has valid score and maxScore
      if (grade.score != null && grade.maxScore != null && grade.maxScore > 0) {
        const percentage = (grade.score / grade.maxScore) * 100;
        return sum + Math.floor(percentage);
      }
      // If using letter grades, use grade map
      if (grade.grade) {
        const gradeMap = {
          'A+': 100, 'A': 95, 'A-': 90,
          'B+': 85, 'B': 80, 'B-': 75,
          'C+': 70, 'C': 65, 'C-': 60,
          'D': 50, 'F': 0
        };
        return sum + (gradeMap[grade.grade] || 0);
      }
      return sum;
    }, 0);

    const level = Math.floor(totalEXP / 500) + 1;
    const currentLevelEXP = totalEXP % 500;
    const nextLevelEXP = 500;

    const completedAssignments = tasksData.filter(t => t.completed).length;
    const totalAssignments = tasksData.length;

    const streak = streakData?.currentStreak || 0;

    setStats({
      totalEXP,
      level,
      currentLevelEXP,
      nextLevelEXP,
      streak,
      totalAssignments,
      completedAssignments
    });
  };

  const markTaskComplete = async (taskId) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/student/task/${taskId}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Task marked as complete!');
        loadStudentData();
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to mark task as complete');
    }
  };

  const handleQuizSubmission = async (submission) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/student/quiz/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submission)
        }
      );

      if (response.ok) {
        toast.success('Quiz submitted successfully!');
        setSelectedQuiz(null);
        loadStudentData();
      } else {
        toast.error('Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    }
  };

  const startQuiz = (quiz) => {
    setSelectedQuiz(quiz);
  };

  const markDailyQuestSeen = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/student/daily-quest/seen`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error) {
      console.error('Error marking daily quest as seen:', error);
    }
  };

  const getGradeBadge = (score, maxScore, letterGrade) => {
    if (letterGrade) {
      const colors = {
        'A+': 'from-green-500 to-emerald-600',
        'A': 'from-green-500 to-emerald-600',
        'A-': 'from-blue-500 to-blue-600',
        'B+': 'from-blue-400 to-blue-500',
        'B': 'from-blue-400 to-blue-500',
        'B-': 'from-yellow-500 to-orange-400',
        'C+': 'from-yellow-500 to-orange-500',
        'C': 'from-orange-400 to-orange-500',
        'C-': 'from-orange-500 to-red-400',
        'D': 'from-red-400 to-red-500',
        'F': 'from-red-500 to-red-600'
      };
      return { label: letterGrade, color: colors[letterGrade] || 'from-gray-400 to-gray-500' };
    }
    if (score == null || maxScore == null || maxScore === 0) {
      return { label: 'N/A', color: 'from-gray-400 to-gray-500' };
    }
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return { label: 'A+', color: 'from-green-500 to-emerald-600' };
    if (percentage >= 85) return { label: 'A', color: 'from-green-500 to-emerald-600' };
    if (percentage >= 80) return { label: 'A-', color: 'from-blue-500 to-blue-600' };
    if (percentage >= 75) return { label: 'B+', color: 'from-blue-400 to-blue-500' };
    if (percentage >= 70) return { label: 'B', color: 'from-blue-400 to-blue-500' };
    if (percentage >= 65) return { label: 'B-', color: 'from-yellow-500 to-orange-400' };
    if (percentage >= 60) return { label: 'C+', color: 'from-yellow-500 to-orange-500' };
    if (percentage >= 55) return { label: 'C', color: 'from-orange-400 to-orange-500' };
    if (percentage >= 50) return { label: 'C-', color: 'from-orange-500 to-red-400' };
    if (percentage >= 40) return { label: 'D', color: 'from-red-400 to-red-500' };
    return { label: 'F', color: 'from-red-500 to-red-600' };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleNotificationClick = (notification) => {
    // If it's a quest notification, navigate to tasks view
    if (notification.type === 'quest') {
      setActiveView('tasks');
      setShowNotifications(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/student/notifications/read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notificationId })
        }
      );

      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Sidebar navigation items (removed notifications)
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'grades', label: 'My Grades', icon: BookOpen },
    { id: 'tasks', label: 'Tasks & Quizzes', icon: ListTodo },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  if (selectedQuiz) {
    return (
      <TakeQuiz
        quiz={selectedQuiz}
        onBack={() => setSelectedQuiz(null)}
        onSubmit={handleQuizSubmission}
      />
    );
  }

  // Sort tasks by creation date (newest first)
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(b.createdAt || b.dueDate) - new Date(a.createdAt || a.dueDate)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-white hover:bg-white/20"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold">Student Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(true)}
              className="text-white hover:bg-white/20 relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Avatar className="w-9 h-9 border-2 border-white shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
                {student.username?.slice(0, 2).toUpperCase() || student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-lg">
                  {student.username?.slice(0, 2).toUpperCase() || student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">{student.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white/80 text-sm">@{student.username}</p>
                  <span className="text-white/60">•</span>
                  <p className="text-white/80 text-sm">Roll: {student.rollNumber}</p>
                  {assignedClass && (
                    <>
                      <span className="text-white/60">•</span>
                      <Badge className="bg-white/20 text-white border-white/30 text-xs">
                        {assignedClass.className}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(true)}
                className="text-white hover:bg-white/20 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Trophy className="w-4 h-4 mr-1" />
                Level {stats.level}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Zap className="w-4 h-4 mr-1" />
                {stats.totalEXP} EXP
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`
          fixed lg:sticky top-0 left-0 h-screen bg-white shadow-2xl z-40
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64 lg:w-72
        `}>
          {/* Sidebar Header */}
          <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-8 h-8" />
                <span className="font-bold text-lg">Student Portal</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Student Info in Sidebar */}
            <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold">
                  {student.username?.slice(0, 2).toUpperCase() || student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{student.name}</p>
                <p className="text-xs text-white/80 truncate">@{student.username}</p>
                <p className="text-xs text-white/80">Roll: {student.rollNumber}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <nav className="p-4 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      if (item.id === 'profile') {
                        setIsProfileDialogOpen(true);
                      }
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer - Logout */}
          <div className="p-4 border-t absolute bottom-0 left-0 right-0 bg-white">
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full justify-start gap-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Admin Broadcast Message */}
            {adminMessage && (
              <Alert className="mb-6 border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <AlertDescription className="ml-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-indigo-900 mb-1">Admin Message</p>
                      <p className="text-sm text-indigo-700">{adminMessage.message}</p>
                      <p className="text-xs text-indigo-500 mt-1">
                        {new Date(adminMessage.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdminMessage(null)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <>
                {/* Daily Quest Card */}
                {dailyQuest && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-white mb-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">Quest of the Day!</h3>
                            <p className="text-white/90 text-sm">Complete for bonus rewards</p>
                          </div>
                        </div>
                        <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                          <Zap className="w-4 h-4 mr-1" />
                          +{dailyQuest.points} pts
                        </Badge>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                        <h4 className="font-bold text-lg mb-2">{dailyQuest.title}</h4>
                        <p className="text-white/90 text-sm leading-relaxed">{dailyQuest.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-white/90">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {dailyQuest.teacherName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(dailyQuest.date).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          onClick={() => setShowDailyQuestDialog(true)}
                          className="bg-white text-orange-600 hover:bg-white/90 font-semibold"
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <CardContent className="p-4 sm:p-6 relative z-10">
                      <Trophy className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                      <span className="text-2xl sm:text-3xl font-bold block">Lv. {stats.level}</span>
                      <p className="text-white/90 text-xs sm:text-sm mb-2">Current Level</p>
                      <Progress value={(stats.currentLevelEXP / stats.nextLevelEXP) * 100} className="h-1.5 sm:h-2 bg-white/20" />
                      <p className="text-[10px] sm:text-xs text-white/80 mt-1">{stats.currentLevelEXP}/{stats.nextLevelEXP} EXP</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <CardContent className="p-4 sm:p-6 relative z-10">
                      <Zap className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                      <span className="text-2xl sm:text-3xl font-bold block">{stats.totalEXP}</span>
                      <p className="text-white/90 text-xs sm:text-sm">Total EXP</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <CardContent className="p-4 sm:p-6 relative z-10">
                      <Flame className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                      <span className="text-2xl sm:text-3xl font-bold block">{stats.streak}</span>
                      <p className="text-white/90 text-xs sm:text-sm">Day Streak</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <CardContent className="p-4 sm:p-6 relative z-10">
                      <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                      <span className="text-2xl sm:text-3xl font-bold block">{stats.completedAssignments}/{stats.totalAssignments}</span>
                      <p className="text-white/90 text-xs sm:text-sm">Completed</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Online Submission Section */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 text-white mb-6 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Online Submission</h3>
                          <p className="text-white/90 text-sm">Submit your assignments online</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                      <p className="text-white/90 text-sm leading-relaxed mb-2">
                        Can't attend college? No problem! Submit your physical assignments online through our submission portal.
                      </p>
                      <p className="text-white/80 text-xs">
                        Teachers can review your submissions and provide feedback digitally.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/90">
                        <Info className="w-4 h-4" />
                        <span>Quick & Easy Submission</span>
                      </div>
                      <Button
                        onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSc_q8vpENuHS4uDXPWVlsdy-fAI_wFbZdOCSOz7rLm2DTalrA/viewform?usp=dialog', '_blank')}
                        className="bg-white text-cyan-600 hover:bg-white/90 font-semibold"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Online
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Dashboard Summary Boxes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Ongoing Tasks */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                        Ongoing Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] sm:h-[350px]">
                        {sortedTasks.filter(t => !t.completed).length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No pending tasks</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sortedTasks.filter(t => !t.completed).map((task) => (
                              <div key={task.id} className="p-3 sm:p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm sm:text-base truncate">{task.title}</h4>
                                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                  </div>
                                  <Badge className={`${getPriorityColor(task.priority)} border ml-2 text-xs`}>
                                    {task.priority}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs sm:text-sm mt-3">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-xs">{new Date(task.dueDate).toLocaleDateString()}</span>
                                  </div>
                                  {task.type === 'quiz' && (
                                    <Button
                                      size="sm"
                                      onClick={() => startQuiz(task)}
                                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 h-7 text-xs"
                                    >
                                      Start Quiz
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Recently Assigned Grades */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                        Recently Assigned Grades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] sm:h-[350px]">
                        {grades.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No grades yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {grades.slice(0, 10).map((grade) => {
                              const badge = getGradeBadge(grade.score, grade.maxScore, grade.grade);
                              const expGained = grade.grade ? (
                                { 'A+': 100, 'A': 95, 'A-': 90, 'B+': 85, 'B': 80, 'B-': 75, 'C+': 70, 'C': 65, 'C-': 60, 'D': 50, 'F': 0 }[grade.grade] || 0
                              ) : Math.floor((grade.score / grade.maxScore) * 100);
                              return (
                                <div key={grade.id} className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm sm:text-base truncate">{grade.assignment}</h4>
                                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{grade.subject || 'Academic'}</p>
                                    </div>
                                    <Badge className={`bg-gradient-to-r ${badge.color} text-white border-0 shadow-sm ml-2`}>
                                      {badge.label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-xs sm:text-sm">
                                    <span className="text-muted-foreground">
                                      {grade.score != null && grade.maxScore ? (
                                        `${grade.score}/${grade.maxScore} (${((grade.score / grade.maxScore) * 100).toFixed(0)}%)`
                                      ) : 'Graded'}
                                    </span>
                                    <div className="flex items-center gap-1 text-yellow-600 font-medium">
                                      <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                                      +{expGained}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Grades View */}
            {activeView === 'grades' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    All Grades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {grades.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-base sm:text-lg mb-2">No grades yet</p>
                      <p className="text-xs sm:text-sm">Your grades will appear here once your teacher assigns them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {grades.map((grade) => {
                        const badge = getGradeBadge(grade.score, grade.maxScore, grade.grade);
                        const expGained = grade.grade ? (
                          { 'A+': 100, 'A': 95, 'A-': 90, 'B+': 85, 'B': 80, 'B-': 75, 'C+': 70, 'C': 65, 'C-': 60, 'D': 50, 'F': 0 }[grade.grade] || 0
                        ) : Math.floor((grade.score / grade.maxScore) * 100);
                        return (
                          <div key={grade.id} className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-white to-gray-50 border shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                  <h3 className="text-base sm:text-lg font-semibold">{grade.assignment}</h3>
                                  <Badge className={`bg-gradient-to-r ${badge.color} text-white border-0 shadow-sm px-2 sm:px-3`}>
                                    Grade: {badge.label}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {grade.subject || 'Academic'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {grade.date ? new Date(grade.date).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-left sm:text-right">
                                <div className="text-xl sm:text-2xl font-bold text-indigo-600 mb-1">
                                  {grade.score != null && grade.maxScore ? (
                                    `${grade.score}/${grade.maxScore}`
                                  ) : badge.label}
                                </div>
                                {grade.score != null && grade.maxScore && (
                                  <div className="text-xs sm:text-sm text-muted-foreground">
                                    {((grade.score / grade.maxScore) * 100).toFixed(0)}%
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t">
                              {grade.feedback ? (
                                <p className="text-xs sm:text-sm text-muted-foreground italic flex-1">
                                  <span className="font-medium">Feedback:</span> "{grade.feedback}"
                                </p>
                              ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground">No feedback provided</p>
                              )}
                              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full border border-yellow-200 w-fit">
                                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                                <span className="text-xs sm:text-sm font-semibold text-yellow-700">+{expGained} EXP</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tasks View */}
            {activeView === 'tasks' && (
              <div className="space-y-6">
                {/* Daily Quest in Tasks View */}
                {dailyQuest && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">Quest of the Day!</h3>
                            <p className="text-white/90 text-sm">Complete for bonus rewards</p>
                          </div>
                        </div>
                        <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                          <Zap className="w-4 h-4 mr-1" />
                          +{dailyQuest.points} pts
                        </Badge>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                        <h4 className="font-bold text-lg mb-2">{dailyQuest.title}</h4>
                        <p className="text-white/90 text-sm leading-relaxed">{dailyQuest.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-white/90">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {dailyQuest.teacherName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(dailyQuest.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regular Tasks */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      My Tasks & Quizzes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedTasks.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ListTodo className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-base sm:text-lg mb-2">No tasks assigned</p>
                        <p className="text-xs sm:text-sm">Your assignments will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedTasks.map((task) => (
                          <div 
                            key={task.id} 
                            className={`p-4 sm:p-6 rounded-xl border shadow-sm hover:shadow-md transition-all ${
                              task.completed 
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className={`text-base sm:text-lg font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </h3>
                                  {task.type === 'quiz' && (
                                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 text-xs">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Quiz - {task.duration} min
                                    </Badge>
                                  )}
                                  <Badge className={`${getPriorityColor(task.priority)} border text-xs`}>
                                    {task.priority}
                                  </Badge>
                                  {task.completed && (
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-3">{task.description}</p>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {task.subject}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {task.totalPoints || task.maxPoints} points
                                  </span>
                                </div>
                              </div>
                              {!task.completed && task.type === 'quiz' && (
                                <Button
                                  onClick={() => startQuiz(task)}
                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 w-full sm:w-auto"
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Start Quiz
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leaderboard View */}
            {activeView === 'leaderboard' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                    Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-base sm:text-lg mb-2">Leaderboard Coming Soon</p>
                    <p className="text-xs sm:text-sm">Rankings will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Daily Quest Dialog */}
      <Dialog open={showDailyQuestDialog} onOpenChange={(open) => {
        setShowDailyQuestDialog(open);
        if (!open) {
          markDailyQuestSeen();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Daily Quest!
            </DialogTitle>
            <DialogDescription>
              Complete today's challenge to earn bonus points
            </DialogDescription>
          </DialogHeader>
          
          {dailyQuest && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
                <h3 className="font-semibold text-lg mb-2 text-yellow-900">{dailyQuest.title}</h3>
                <p className="text-sm text-yellow-800 mb-3">{dailyQuest.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <Badge className="bg-yellow-500 text-white border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    +{dailyQuest.points} EXP
                  </Badge>
                  <span className="text-yellow-700">Due: {new Date(dailyQuest.dueDate).toLocaleDateString()}</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowDailyQuestDialog(false);
                  markDailyQuestSeen();
                }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white border-0"
              >
                Got it! Let's go 🚀
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              My Profile
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 sm:space-y-6 py-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-indigo-200 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl sm:text-2xl">
                  {student.username?.slice(0, 2).toUpperCase() || student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">{student.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">@{student.username}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Roll: {student.rollNumber}</p>
                <Badge className="mt-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 text-xs">
                  Level {stats.level} • {stats.totalEXP} EXP
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Profile Info (Read-only fields) */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Username</Label>
                  <p className="font-medium">@{student.username}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Roll Number</Label>
                  <p className="font-medium">{student.rollNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Batch</Label>
                  <p className="font-medium">{student.batch}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium text-sm truncate">{student.email}</p>
                </div>
              </div>

              {assignedClass && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
                  <h4 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Current Class
                  </h4>
                  <p className="text-sm text-indigo-900">{assignedClass.className}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 text-center">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-purple-600" />
                <p className="text-xl sm:text-2xl font-bold text-purple-700">Lv. {stats.level}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Level</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 text-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-yellow-600" />
                <p className="text-xl sm:text-2xl font-bold text-yellow-700">{stats.totalEXP}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">EXP</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-center">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-green-600" />
                <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.completedAssignments}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Done</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsProfileDialogOpen(false)}
              className="w-full sm:w-auto text-sm"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dropdown */}
      <NotificationsDropdown
        notifications={notifications}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={markNotificationAsRead}
      />
    </div>
  );
}