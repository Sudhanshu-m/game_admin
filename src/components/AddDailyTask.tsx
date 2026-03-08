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

export function AddDailyTask({ selectedClass, onBack, accessToken }) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [subject, setSubject] = useState(selectedClass?.name || '');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [rewardPoints, setRewardPoints] = useState('100');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskTitle.trim() || !taskDescription.trim() || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/add-task`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: taskTitle,
            description: taskDescription,
            points: parseInt(rewardPoints) || 100,
            date: dueDate,
            class_id: selectedClass?.id,
            type: 'task',
            subject: subject,
            priority: priority,
          })
        }
      );

      if (response.ok) {
        toast.success('Task assigned to all students in the class!');
        setTaskTitle('');
        setTaskDescription('');
        setDueDate('');
        setPriority('Medium');
        setRewardPoints('100');
        onBack();
      } else {
        const errorData = await response.json();
        toast.error('Failed to create task: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Class
          </Button>
        </div>

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-amber-500" />
          Add Daily Task - {selectedClass?.name}
        </h1>

        {/* Info Banner */}
        <Alert className="mb-6 border-0 bg-gradient-to-r from-amber-50 to-pink-50 shadow-sm">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 ml-2">
            This task will be automatically assigned to all students currently enrolled in {selectedClass?.name}. It will appear as a highlighted task card on their dashboard.
          </AlertDescription>
        </Alert>

        {/* Form Card */}
        <Card className="border-0 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6 space-y-6">
              {/* Task Title */}
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

              {/* Task Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  Task Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the quest and what students need to accomplish..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={4}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-base font-semibold">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-base"
                  />
                </div>

                {/* Due Date */}
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

                {/* Priority */}
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

                {/* Reward Points */}
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

              {/* Task Assignment Info */}
              <Alert className="border-l-4 border-l-amber-500 bg-amber-50">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 ml-2">
                  <strong>Task Assignment:</strong> This daily task will be automatically assigned to all {selectedClass?.studentCount || 0} student(s) currently enrolled in {selectedClass?.name}. It will appear as a highlighted task card on their dashboard!
                </AlertDescription>
              </Alert>
            </div>

            {/* Action Buttons */}
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
