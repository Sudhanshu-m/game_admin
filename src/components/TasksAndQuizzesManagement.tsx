import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ListTodo, 
  Clock, 
  CheckCircle2, 
  Users, 
  Calendar,
  Edit2,
  Trash2,
  BookOpen,
  Target,
  AlertCircle,
  TrendingUp,
  FileText,
  Brain,
  X,
  Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Letter grades with colors
const letterGrades = [
  { value: 'A+', label: 'A+', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'A', label: 'A', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'A-', label: 'A-', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'B+', label: 'B+', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'B', label: 'B', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'B-', label: 'B-', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { value: 'C+', label: 'C+', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'C', label: 'C', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'C-', label: 'C-', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
  { value: 'D', label: 'D', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'F', label: 'F', color: 'bg-red-100 text-red-800 border-red-300' }
];

export function TasksAndQuizzesManagement({ 
  tasks, 
  classes, 
  students, 
  onEditTask, 
  onDeleteTask,
  projectId,
  accessToken 
}) {
  const [taskStats, setTaskStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTaskForStudents, setSelectedTaskForStudents] = useState(null);
  const [studentListType, setStudentListType] = useState(null); // 'assigned', 'attempted', 'completed'
  const [studentsList, setStudentsList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [studentGrades, setStudentGrades] = useState({}); // Store grades: { studentEmail: grade }

  // Validate required props
  useEffect(() => {
    if (!projectId) {
      console.error('ERROR: projectId is missing in TasksAndQuizzesManagement');
      toast.error('Configuration error: Project ID is missing');
    }
    if (!accessToken) {
      console.error('ERROR: accessToken is missing in TasksAndQuizzesManagement');
      toast.error('Configuration error: Access token is missing');
    }
  }, [projectId, accessToken]);

  useEffect(() => {
    calculateTaskStats();
  }, [tasks, students]);

  const calculateTaskStats = async () => {
    setLoading(true);
    
    try {
      // Fetch all task statistics in one API call
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/task-stats`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Task statistics loaded:', data.taskStats);
        setTaskStats(data.taskStats || {});
      } else {
        console.error('Failed to load task statistics');
        toast.error('Failed to load task statistics');
      }
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      toast.error('Error loading statistics');
    }
    
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (completionRate) => {
    if (completionRate >= 80) return 'text-green-600 bg-green-50';
    if (completionRate >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const allTasks = tasks || [];
  const regularTasks = allTasks.filter(t => t.type !== 'quiz');
  const quizzes = allTasks.filter(t => t.type === 'quiz');

  const renderTaskCard = (task) => {
    const stats = taskStats[task.id] || { totalStudents: 0, completed: 0, attempted: 0, completionRate: 0, attemptRate: 0 };
    const overdue = isOverdue(task.dueDate);
    const isQuiz = task.type === 'quiz';

    return (
      <Card key={task.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isQuiz ? (
                  <Brain className="w-5 h-5 text-indigo-600" />
                ) : (
                  <FileText className="w-5 h-5 text-green-600" />
                )}
                <CardTitle className="text-lg">{task.title}</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={isQuiz ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0' : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0'}>
                  {isQuiz ? 'Quiz' : 'Task'}
                </Badge>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority || 'Medium'} Priority
                </Badge>
                {overdue && (
                  <Badge className="bg-red-500 text-white border-0">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
                {task.status === 'active' ? (
                  <Badge className="bg-blue-500 text-white border-0">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditTask(task)}
                className="hover:bg-blue-50 hover:border-blue-300"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteTask(task.id)}
                className="hover:bg-red-50 hover:border-red-300 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{task.description}</p>
          
          {/* Task Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Class</p>
                <p className="text-sm font-medium">{task.className}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm font-medium">{formatDate(task.dueDate)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-sm font-medium">{task.totalPoints || task.maxPoints}</p>
              </div>
            </div>
            
            {isQuiz && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{task.duration} min</p>
                </div>
              </div>
            )}
            
            {!isQuiz && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{task.subject}</p>
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Student Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.completed}/{stats.totalStudents} completed
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className={`font-medium px-2 py-1 rounded ${getStatusColor(stats.completionRate)}`}>
                  {stats.completionRate}%
                </span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
            </div>

            {isQuiz && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="font-medium">{task.questions?.length || 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Stats */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <button
              onClick={() => fetchStudentsList(task.id, 'assigned')}
              className="text-center p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </button>
            
            <button
              onClick={() => fetchStudentsList(task.id, 'attempted')}
              className="text-center p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.attempted}</p>
              <p className="text-xs text-muted-foreground">Attempted</p>
            </button>
            
            <button
              onClick={() => fetchStudentsList(task.id, 'completed')}
              className="text-center p-3 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const fetchStudentsList = async (taskId, listType) => {
    setLoadingStudents(true);
    setSelectedTaskForStudents(taskId);
    setStudentListType(listType);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/task-students`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskId,
            listType
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudentsList(data.students || []);
        
        // Fetch existing grades for these students
        const gradesResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/task-grades/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (gradesResponse.ok) {
          const gradesData = await gradesResponse.json();
          setStudentGrades(gradesData.grades || {});
        }
      } else {
        console.error('Failed to fetch students list');
        toast.error('Failed to fetch students list');
      }
    } catch (error) {
      console.error('Error fetching students list:', error);
      toast.error('Error fetching students list');
    }

    setLoadingStudents(false);
    setIsStudentDialogOpen(true);
  };

  const handleGradeChange = async (studentEmail, grade) => {
    try {
      console.log('Assigning grade:', { studentEmail, grade, taskId: selectedTaskForStudents });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/task-grade`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskId: selectedTaskForStudents,
            studentEmail,
            grade
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Backend response:', result);
        
        // Wait 2 seconds for KV store to sync
        console.log('Waiting for database sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the grade was saved by fetching it back
        console.log('Verifying grade was saved...');
        const verifyResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/task-grades/${selectedTaskForStudents}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const savedGrade = verifyData.grades[studentEmail];
          console.log('Verification result:', { 
            studentEmail, 
            expectedGrade: grade, 
            savedGrade,
            allGrades: verifyData.grades 
          });
          
          if (savedGrade === grade) {
            console.log('✓ Grade verified successfully');
            toast.success(`Grade ${grade} assigned and verified!`);
            
            // Update local state
            setStudentGrades(prev => ({
              ...prev,
              [studentEmail]: grade
            }));
            
            // Refresh the list to show updated data
            await fetchStudentsList(selectedTaskForStudents, studentListType);
            
            // Refresh stats
            await calculateTaskStats();
          } else {
            console.error('✗ Grade verification failed - grade not found in database');
            toast.error('Grade saved but verification failed. Please check the Completed list.');
          }
        } else {
          console.error('Failed to verify grade');
          toast.warning('Grade may have been saved. Please refresh the page.');
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to save grade:', errorText);
        toast.error('Failed to save grade');
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Error saving grade');
    }
  };

  const getGradeColor = (grade) => {
    const gradeObj = letterGrades.find(g => g.value === grade);
    return gradeObj ? gradeObj.color : 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Tasks & Quizzes Management
        </h1>
        <p className="text-muted-foreground">
          View and manage all your assigned tasks and quizzes
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
                <p className="text-3xl font-bold text-blue-600">{regularTasks.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Quizzes</p>
                <p className="text-3xl font-bold text-purple-600">{quizzes.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">
                  {allTasks.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overdue</p>
                <p className="text-3xl font-bold text-orange-600">
                  {allTasks.filter(t => isOverdue(t.dueDate) && t.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Tasks and Quizzes */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
          <TabsTrigger value="all">
            All ({allTasks.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({regularTasks.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            Quizzes ({quizzes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {allTasks.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <ListTodo className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Tasks or Quizzes Yet</h3>
                <p className="text-muted-foreground">
                  You haven't created any tasks or quizzes. Start by creating one!
                </p>
              </CardContent>
            </Card>
          ) : (
            allTasks.map(task => renderTaskCard(task))
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          {regularTasks.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Tasks Created</h3>
                <p className="text-muted-foreground">
                  Create your first task from a class view.
                </p>
              </CardContent>
            </Card>
          ) : (
            regularTasks.map(task => renderTaskCard(task))
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-6">
          {quizzes.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Quizzes Created</h3>
                <p className="text-muted-foreground">
                  Create your first quiz from a class view.
                </p>
              </CardContent>
            </Card>
          ) : (
            quizzes.map(task => renderTaskCard(task))
          )}
        </TabsContent>
      </Tabs>

      {/* Student List Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {studentListType === 'assigned' ? '👥 Assigned Students' :
               studentListType === 'attempted' ? '📝 Attempted Students' :
               studentListType === 'completed' ? '✅ Completed Students' :
               '👥 Students'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {studentListType === 'assigned' && 'List of students assigned to this task.'}
              {studentListType === 'attempted' && 'List of students who have attempted this task.'}
              {studentListType === 'completed' && 'List of students who have completed this task.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            {loadingStudents ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3"></div>
                  <p className="text-sm text-muted-foreground">Loading students...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {studentsList.length > 0 ? (
                  <>
                    <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-900">
                        Total: <span className="text-xl font-bold">{studentsList.length}</span> student{studentsList.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {studentsList.map((student, index) => (
                      <div 
                        key={student.id || index} 
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                            <p className="text-xs text-muted-foreground">Roll No: {student.rollNumber || student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Grade Badge - Show current grade */}
                          {student.grade && (
                            <Badge className={getGradeColor(student.grade)}>
                              <Award className="w-3 h-3 mr-1" />
                              {student.grade}
                            </Badge>
                          )}
                          
                          {/* Grade Selection Dropdown - Only show for assigned students */}
                          {studentListType === 'assigned' && (
                            <Select
                              value={student.grade || ''}
                              onValueChange={(value) => handleGradeChange(student.email, value)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue placeholder="Assign Grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {letterGrades.map(grade => (
                                  <SelectItem key={grade.value} value={grade.value}>
                                    {grade.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {studentListType === 'assigned' && 'All students in this class have been graded. Check the Completed tab to see graded students.'}
                      {studentListType === 'attempted' && 'No students have attempted this task yet.'}
                      {studentListType === 'completed' && 'No students have been graded yet. Assign grades to students to complete their tasks.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsStudentDialogOpen(false)}
              className="hover:bg-gray-100"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}