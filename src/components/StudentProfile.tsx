import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  Trophy, 
  Star, 
  Target, 
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  School,
  Edit,
  Flame,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { dentalClasses, getClassesByYear } from '../utils/dentalClasses';
import { projectId } from '../utils/supabase/info';

// Mock detailed student data
const getStudentDetails = (student) => ({
  ...student,
  gameStats: {
    totalGamesPlayed: 156,
    gamesWon: 134,
    winRate: 86,
    streakCurrent: 12,
    streakBest: 23,
    timeSpent: "45h 32m",
    achievements: [
      { id: 1, name: "Math Master", description: "Complete 50 math problems", unlocked: true, date: "2024-08-15" },
      { id: 2, name: "Speed Runner", description: "Complete 10 games in under 2 minutes", unlocked: true, date: "2024-08-20" },
      { id: 3, name: "Perfect Score", description: "Get 100% on 5 consecutive games", unlocked: false, progress: 3 },
      { id: 4, name: "Knowledge Seeker", description: "Play games for 50 hours", unlocked: true, date: "2024-09-01" },
      { id: 5, name: "Consistency Champion", description: "Play every day for 30 days", unlocked: false, progress: 18 }
    ]
  },
  recentGrades: [
    { subject: "Math", assignment: "Algebra Quiz 1", score: 95, date: "2024-08-28", maxScore: 100 },
    { subject: "Science", assignment: "Chemistry Lab", score: 88, date: "2024-08-25", maxScore: 100 },
    { subject: "Math", assignment: "Geometry Test", score: 92, date: "2024-08-22", maxScore: 100 },
    { subject: "English", assignment: "Essay Writing", score: 85, date: "2024-08-20", maxScore: 100 },
    { subject: "Science", assignment: "Physics Problems", score: 90, date: "2024-08-18", maxScore: 100 }
  ],
  skillProgress: [
    { skill: "Problem Solving", level: 8, progress: 75, maxLevel: 10 },
    { skill: "Critical Thinking", level: 7, progress: 60, maxLevel: 10 },
    { skill: "Mathematical Reasoning", level: 9, progress: 90, maxLevel: 10 },
    { skill: "Scientific Method", level: 6, progress: 45, maxLevel: 10 },
    { skill: "Communication", level: 7, progress: 70, maxLevel: 10 }
  ]
});

export function StudentProfile({ student, onBack, classes, onUpdateStudentClass }) {
  const [studentDetails] = useState(getStudentDetails(student));
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState(student.classId);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0, dates: [] });
  const [taskData, setTaskData] = useState({ tasks: [], completedCount: 0, totalCount: 0 });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const classesByYear = getClassesByYear();

  // Fetch real streak and task data from backend
  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoadingData(true);
      try {
        // Get access token from localStorage (teachers should have it)
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          console.error('No access token found');
          setIsLoadingData(false);
          return;
        }

        // Fetch streak data
        const streakResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/student-streak/${student.email}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (streakResponse.ok) {
          const streakResult = await streakResponse.json();
          setStreakData(streakResult.streakData || { currentStreak: 0, longestStreak: 0, dates: [] });
        }

        // Fetch task data
        const tasksResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/student-tasks/${student.email}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (tasksResponse.ok) {
          const tasksResult = await tasksResponse.json();
          const tasks = tasksResult.tasks || [];
          const completedCount = tasks.filter(t => t.completed).length;
          setTaskData({
            tasks,
            completedCount,
            totalCount: tasks.length
          });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (student && student.email) {
      fetchStudentData();
    }
  }, [student]);

  const getGradeColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSkillColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleClassUpdate = () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    
    const newClass = dentalClasses.find(c => c.id === selectedClass);
    if (newClass) {
      onUpdateStudentClass(student.id, selectedClass, newClass.name);
      setIsEditingClass(false);
      toast.success(`Student assigned to ${newClass.name}`);
    }
  };

  return (
    <div className="p-6">
      {/* Header with gradient to match Admin Settings */}
      <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <GraduationCap className="w-32 h-32" />
        </div>
        
        <Button onClick={onBack} variant="ghost" className="mb-6 text-white hover:bg-white/20 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-white/20 shadow-xl">
              <AvatarImage src={studentDetails.avatarUrl} />
              <AvatarFallback className="text-2xl bg-white text-indigo-600 font-bold">
                {studentDetails.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg">
              <div className="bg-indigo-100 rounded-full p-1">
                <Trophy className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-1">{studentDetails.name}</h1>
            <p className="text-white/80 mb-4">{studentDetails.email}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="font-medium">Level {studentDetails.currentLevel}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Award className="w-4 h-4 text-blue-300" />
                <span className="font-medium">{studentDetails.totalPoints} XP</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <span className="font-medium">{studentDetails.gameProgress}% Course Progress</span>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {studentDetails.subjects.map((subject, index) => (
                <Badge key={index} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Class */}
        <div className="space-y-6">
          {/* Class Assignment Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
            <div className="h-2 bg-indigo-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-indigo-600" />
                  <span>Class Assignment</span>
                </div>
                {!isEditingClass && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingClass(true)}
                    className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingClass ? (
                <div className="space-y-3">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="border-indigo-200 focus:ring-indigo-500">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {Object.entries(classesByYear).map(([year, yearClasses]) => (
                        <React.Fragment key={year}>
                          <div className="px-2 py-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50/50">
                            {year}
                          </div>
                          {yearClasses.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.subject}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleClassUpdate}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingClass(false);
                        setSelectedClass(student.classId);
                      }}
                      size="sm"
                      className="flex-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-indigo-900">{studentDetails.className}</p>
                    <p className="text-xs text-indigo-500 font-medium uppercase tracking-tight">Active Enrollment</p>
                  </div>
                  <div className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold">
                    VERIFIED
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 bg-gradient-to-br from-rose-50 to-white shadow-md">
              <CardContent className="p-4">
                <div className="bg-rose-100 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  <Flame className="w-5 h-5 text-rose-600" />
                </div>
                <p className="text-2xl font-bold text-rose-900">{streakData?.currentStreak || 0}</p>
                <p className="text-xs font-medium text-rose-600 uppercase">Day Streak</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-md">
              <CardContent className="p-4">
                <div className="bg-emerald-100 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-900">{taskData?.completedCount || 0}</p>
                <p className="text-xs font-medium text-emerald-600 uppercase">Completed</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Main Content Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl mb-6">
              <TabsTrigger value="overview" className="rounded-lg px-6 py-2.5">Overview</TabsTrigger>
              <TabsTrigger value="game-progress" className="rounded-lg px-6 py-2.5">Game Stats</TabsTrigger>
              <TabsTrigger value="grades" className="rounded-lg px-6 py-2.5">Grades</TabsTrigger>
              <TabsTrigger value="achievements" className="rounded-lg px-6 py-2.5">Badges</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-lg bg-white overflow-hidden">
                  <CardHeader className="border-b bg-slate-50/50 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Activity Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-muted-foreground">Total XP Earned</span>
                      <span className="font-bold">{studentDetails.totalPoints}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-muted-foreground">Active Days</span>
                      <span className="font-bold">{streakData.dates?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Time Invested</span>
                      <span className="font-bold">{studentDetails.gameStats.timeSpent}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white overflow-hidden">
                  <CardHeader className="border-b bg-slate-50/50 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-500" />
                      Task Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-3xl font-bold">{Math.round((taskData.completedCount / Math.max(1, taskData.totalCount)) * 100)}%</span>
                      <span className="text-sm text-muted-foreground mb-1">{taskData.completedCount} / {taskData.totalCount} Tasks</span>
                    </div>
                    <Progress value={(taskData.completedCount / Math.max(1, taskData.totalCount)) * 100} className="h-2 bg-slate-100" />
                  </CardContent>
                </Card>
              </div>

              {/* Recent Tasks List */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-indigo-600" />
                      Recent Activity
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">Last 5 Assignments</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {taskData.tasks.length > 0 ? (
                      taskData.tasks.slice(0, 5).map((task, index) => (
                        <div key={index} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                          <div className="flex items-start gap-4">
                            <div className={`mt-1 p-2 rounded-lg ${task.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <h4 className={`text-sm font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                {task.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={task.completed ? "secondary" : "default"} className={`text-[10px] ${!task.completed && 'bg-indigo-600'}`}>
                            {task.type || 'TASK'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">No recent activity found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Other tabs remain largely the same but with minor styling updates */}
            <TabsContent value="game-progress" className="animate-in fade-in duration-300">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-sm font-bold">Game Statistics</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-3xl font-black text-indigo-600">{studentDetails.gameStats.gamesWon}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Games Won</p>
                    </div>
                    <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-3xl font-black text-orange-600">{studentDetails.gameStats.streakBest}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Best Streak</p>
                    </div>
                    <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 md:col-span-1">
                      <p className="text-3xl font-black text-blue-600">{studentDetails.gameStats.winRate}%</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Win Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grades" className="animate-in fade-in duration-300">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-sm font-bold">Academic Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {studentDetails.recentGrades.map((grade, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{grade.assignment}</h4>
                          <p className="text-xs text-muted-foreground">{grade.subject}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${getGradeColor(grade.score)}`}>
                            {grade.score}/{grade.maxScore}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">{new Date(grade.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentDetails.gameStats.achievements.map((achievement) => (
                  <Card key={achievement.id} className={`border-0 shadow-md transition-all ${achievement.unlocked ? 'bg-white opacity-100' : 'bg-slate-50/50 opacity-60'}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${achievement.unlocked ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900">{achievement.name}</h4>
                        <p className="text-xs text-muted-foreground leading-tight">{achievement.description}</p>
                        {!achievement.unlocked && achievement.progress && (
                          <div className="mt-2">
                            <Progress value={(achievement.progress / 5) * 100} className="h-1" />
                          </div>
                        )}
                      </div>
                      {achievement.unlocked && (
                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          UNLOCKED
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
                {studentDetails.recentGrades.map((grade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{grade.assignment}</p>
                      <p className="text-sm text-muted-foreground">{grade.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getGradeColor(grade.score)}`}>
                        {grade.score}/{grade.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">{grade.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentDetails.gameStats.achievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 border-0 rounded-xl shadow-md ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-100 ring-2 ring-green-200' 
                        : 'bg-gradient-to-br from-gray-50 to-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full shadow-sm ${
                        achievement.unlocked 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      }`}>
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        {achievement.unlocked ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-sm">
                              ✨ Unlocked
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {achievement.date}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{achievement.progress}/5</span>
                            </div>
                            <Progress value={(achievement.progress / 5) * 100} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}