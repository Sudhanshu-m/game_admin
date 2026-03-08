import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, BookOpen, Save, Camera } from "lucide-react";
import { toast } from "sonner@2.0.3";

export function StudentProfile({ student, onBack }) {
  const [profileData, setProfileData] = useState({
    name: student?.name || "",
    email: student?.email || "",
    phone: student?.phone || "",
    rollNumber: student?.rollNumber || "",
    batch: student?.batch || "",
    department: student?.department || "",
    specialization: student?.specialization || "",
    qualification: student?.qualification || "",
    joinDate: student?.joinDate || "",
    address: student?.address || "",
    bio: student?.bio || "",
  });

  const handleSave = () => {
    toast.success("Profile updated successfully!");
  };

  const initials = profileData.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button onClick={onBack} variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Header Banner */}
        <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white/20">
                <AvatarImage src={student?.avatarUrl} />
                <AvatarFallback className="text-xl bg-white text-indigo-600 font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-white/20 hover:bg-white/30">
                <Camera className="w-5 h-5 text-white" />
              </Button>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profileData.name}</h1>
              <p className="text-white/80">{student?.rollNumber || 'Student'}</p>
            </div>
          </div>
        </div>

        {/* Settings Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Profile Information</h2>
          <p className="text-slate-600">Update your personal and professional details</p>
        </div>

        {/* Profile Form Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 space-y-6">
            {/* Grid Layout - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="pl-10 bg-slate-50"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="pl-10 bg-slate-100 text-slate-500"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="pl-10 bg-slate-50"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              {/* Roll Number */}
              <div className="space-y-2">
                <Label htmlFor="rollNumber" className="font-semibold">Roll Number</Label>
                <Input
                  id="rollNumber"
                  value={profileData.rollNumber}
                  onChange={(e) => setProfileData({ ...profileData, rollNumber: e.target.value })}
                  className="bg-slate-50"
                />
              </div>

              {/* Batch */}
              <div className="space-y-2">
                <Label htmlFor="batch" className="font-semibold">Batch</Label>
                <Input
                  id="batch"
                  value={profileData.batch}
                  onChange={(e) => setProfileData({ ...profileData, batch: e.target.value })}
                  className="bg-slate-50"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department" className="font-semibold">Department</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="department"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    className="pl-10 bg-slate-50"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div className="space-y-2">
                <Label htmlFor="specialization" className="font-semibold">Specialization</Label>
                <Input
                  id="specialization"
                  value={profileData.specialization}
                  onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                  className="bg-slate-50"
                />
              </div>

              {/* Qualification */}
              <div className="space-y-2">
                <Label htmlFor="qualification" className="font-semibold">Qualification</Label>
                <Input
                  id="qualification"
                  value={profileData.qualification}
                  onChange={(e) => setProfileData({ ...profileData, qualification: e.target.value })}
                  className="bg-slate-50"
                />
              </div>

              {/* Join Date */}
              <div className="space-y-2">
                <Label htmlFor="joinDate" className="font-semibold">Join Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="joinDate"
                    value={profileData.joinDate}
                    onChange={(e) => setProfileData({ ...profileData, joinDate: e.target.value })}
                    className="pl-10 bg-slate-50"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="font-semibold">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="pl-10 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Bio - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="font-semibold">Bio</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
                className="bg-slate-50 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
