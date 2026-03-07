import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function QuestDialog({ isOpen, onClose, accessToken, projectId, classes }) {
  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [questPoints, setQuestPoints] = useState('50');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!questTitle.trim() || !questDescription.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2fad19e1/teacher/quest`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: questTitle,
            description: questDescription,
            points: parseInt(questPoints) || 50,
            date: new Date().toISOString().split('T')[0],
            class_id: selectedClass
          })
        }
      );

      if (response.ok) {
        toast.success('Quest assigned to all students! 🎯');
        setQuestTitle('');
        setQuestDescription('');
        setQuestPoints('50');
        onClose();
      } else {
        const errorData = await response.json();
        toast.error('Failed to assign quest: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error assigning quest:', error);
      toast.error('Failed to assign quest');
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            Assign Task of the Day
          </DialogTitle>
          <DialogDescription>
            Create a special task that will appear on all students' dashboards today.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="quest-title">Task Title</Label>
            <Input
              id="quest-title"
              placeholder="e.g., Master the Root Canal Technique"
              value={questTitle}
              onChange={(e) => setQuestTitle(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="quest-description">Task Description</Label>
            <Textarea
              id="quest-description"
              placeholder="Describe what students need to accomplish today..."
              value={questDescription}
              onChange={(e) => setQuestDescription(e.target.value)}
              className="mt-1 min-h-[120px]"
              required
            />
          </div>

          <div>
            <Label htmlFor="quest-points">Reward Points</Label>
            <Input
              id="quest-points"
              type="number"
              min="10"
              max="1000"
              placeholder="50"
              value={questPoints}
              onChange={(e) => setQuestPoints(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="quest-class">Class</Label>
            <Select
              id="quest-class"
              value={selectedClass}
              onValueChange={(value) => setSelectedClass(value)}
              className="mt-1"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Assign Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}