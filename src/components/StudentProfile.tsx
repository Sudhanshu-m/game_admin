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
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
        
        <div className="flex items-start gap-6">
          <Avatar className="w-20 h-20">
            <AvatarImage src={studentDetails.avatarUrl} />
            <AvatarFallback className="text-lg">{studentDetails.avatar}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{studentDetails.name}</h1>
            <p className="text-muted-foreground mb-4">{studentDetails.email}</p>
            
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Level {studentDetails.currentLevel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-blue-500" />
                <span>{studentDetails.totalPoints} Points</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                <span>{studentDetails.gameProgress}% Complete</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {studentDetails.subjects.map((subject, index) => (
                <Badge key={index} variant="secondary">
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Class Assignment Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-blue-500" />
                <span>Class Assignment</span>
              </div>
              {!isEditingClass && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingClass(true)}
                  className="h-8"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Change Class
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingClass ? (
              <div className="space-y-3">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {Object.entries(classesByYear).map(([year, yearClasses]) => (
                      <React.Fragment key={year}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50">
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
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
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
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{studentDetails.className}</p>
                  <p className="text-xs text-muted-foreground">Current Class</p>
                </div>
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
                  Enrolled
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="game-progress">Game Progress</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Real-time Student Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 bg-gradient-to-br from-pink-50 to-rose-100 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-pink-500 rounded-full">
                    <Flame className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-pink-700">Current Streak</span>
                </div>
                {isLoadingData ? (
                  <p className="text-2xl font-bold text-pink-800">...</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-pink-800">{streakData.currentStreak} days</p>
                    <p className="text-xs text-pink-600 mt-1">Best: {streakData.longestStreak} days</p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-100 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-green-500 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-green-700">Tasks Completed</span>
                </div>
                {isLoadingData ? (
                  <p className="text-2xl font-bold text-green-800">...</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-800">{taskData.completedCount}/{taskData.totalCount}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {taskData.totalCount > 0 
                        ? `${Math.round((taskData.completedCount / taskData.totalCount) * 100)}% completion rate`
                        : 'No tasks assigned yet'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-blue-500 rounded-full">
                    <ListTodo className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-blue-700">Total Tasks</span>
                </div>
                {isLoadingData ? (
                  <p className="text-2xl font-bold text-blue-800">...</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-blue-800">{taskData.totalCount}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {taskData.totalCount - taskData.completedCount} pending
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-purple-500 rounded-full">
                    <Calendar className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-purple-700">Active Days</span>
                </div>
                {isLoadingData ? (
                  <p className="text-2xl font-bold text-purple-800">...</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-purple-800">{streakData.dates?.length || 0}</p>
                    <p className="text-xs text-purple-600 mt-1">Last 365 days</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Streak Information Card */}
          {!isLoadingData && streakData.currentStreak > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Consistency Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border-2 border-orange-200">
                    <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-3xl font-bold text-orange-600">{streakData.currentStreak}</p>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border-2 border-pink-200">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                    <p className="text-3xl font-bold text-pink-600">{streakData.longestStreak}</p>
                    <p className="text-sm text-muted-foreground">Longest Streak</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border-2 border-rose-200">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                    <p className="text-3xl font-bold text-rose-600">{streakData.dates?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Days</p>
                  </div>
                </div>
                {streakData.lastActivityDate && (
                  <p className="text-sm text-center text-muted-foreground mt-4">
                    Last activity: {new Date(streakData.lastActivityDate).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tasks Overview Card */}
          {!isLoadingData && taskData.tasks.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-indigo-600" />
                  Recent Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taskData.tasks.slice(0, 5).map((task, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border ${
                        task.completed 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h4>
                            {task.completed && (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {task.subject}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          className={`ml-2 ${
                            task.completed 
                              ? 'bg-green-500' 
                              : task.priority === 'high' 
                                ? 'bg-red-500' 
                                : task.priority === 'medium' 
                                  ? 'bg-yellow-500' 
                                  : 'bg-blue-500'
                          } text-white border-0`}
                        >
                          {task.type || 'task'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {taskData.tasks.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground mt-3">
                    +{taskData.tasks.length - 5} more tasks
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Skill Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentDetails.skillProgress.map((skill, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Level {skill.level}/{skill.maxLevel}
                      </span>
                      <span className="text-sm font-medium">{skill.progress}%</span>
                    </div>
                  </div>
                  <Progress value={skill.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="game-progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Course Completion</span>
                    <span className="font-medium">{studentDetails.gameProgress}%</span>
                  </div>
                  <Progress value={studentDetails.gameProgress} className="h-3" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{studentDetails.gameStats.gamesWon}</p>
                    <p className="text-sm text-muted-foreground">Games Won</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{studentDetails.gameStats.streakBest}</p>
                    <p className="text-sm text-muted-foreground">Best Streak</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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