import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

export function AddDailyTask({ selectedClass, classes = [], onBack, accessToken, onTaskCreated }) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(selectedClass?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [rewardPoints, setRewardPoints] = useState('100');
  const [loading, setLoading] = useState(false);

  const activeClass = selectedClass || classes.find(c => c.id === selectedClassId) || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskTitle.trim() || !taskDescription.trim() || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const pts = parseInt(rewardPoints) || 100;
      const payload = {
        id: `task-${Date.now()}`,
        title: taskTitle,
        description: taskDescription,
        maxPoints: pts,
        points: pts,
        dueDate: dueDate,
        date: dueDate,
        classId: activeClass?.id || null,
        className: activeClass?.name || null,
        subject: activeClass?.name || 'General',
        priority: priority,
        type: 'task',
        status: 'active',
      };

      console.log('Creating task with:', payload);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/tasks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error('Non-JSON response from server:', rawText.substring(0, 200));
        toast.error('Server returned an unexpected response. Please try again.');
        setLoading(false);
        return;
      }

      if (response.ok) {
        const assignMsg = activeClass
          ? `Task created and assigned to all students in ${activeClass.name}!`
          : 'Task created and assigned to all students!';
        toast.success(assignMsg);
        setTaskTitle('');
        setTaskDescription('');
        setDueDate('');
        setPriority('Medium');
        setRewardPoints('100');
        setSelectedClassId(selectedClass?.id || '');
        if (onTaskCreated) {
          onTaskCreated(data);
        }
        onBack();
      } else {
        console.error('Task creation error response:', data);
        toast.error('Failed to create task: ' + (data?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task. Please check your connection and try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-amber-500" />
          Add Task {activeClass && `- ${activeClass.name}`}
        </h1>

        <Alert className="mb-6 border-0 bg-gradient-to-r from-amber-50 to-pink-50 shadow-sm">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 ml-2">
            {activeClass
              ? `This task will be automatically assigned to all students currently enrolled in ${activeClass.name}.`
              : 'This task will be assigned to all registered students.'}
            {' '}It will appear as a highlighted task card on their dashboard.
          </AlertDescription>
        </Alert>

        <Card className="border-0 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">
                  Task Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Master Oral Pathology Case Studies"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  Task Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the task and what students need to accomplish..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={4}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class / Subject dropdown */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Class / Subject <span className="text-red-500">*</span>
                  </Label>
                  {selectedClass ? (
                    <Input
                      value={selectedClass.name}
                      disabled
                      className="text-base bg-slate-50"
                    />
                  ) : (
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select a class (or leave for all students)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students (No specific class)</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-base font-semibold">
                    Due Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-base font-semibold">
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-base font-semibold">
                    Reward Points <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="points"
                    type="number"
                    min="10"
                    max="1000"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>

              <Alert className="border-l-4 border-l-amber-500 bg-amber-50">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 ml-2">
                  <strong>Task Assignment:</strong>{' '}
                  {activeClass
                    ? `This task will be automatically assigned to all students currently enrolled in ${activeClass.name}.`
                    : 'This task will be assigned to all registered students.'}{' '}
                  It will appear as a highlighted task card on their dashboard!
                </AlertDescription>
              </Alert>
            </div>

            <div className="border-t p-6 flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white border-0"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
