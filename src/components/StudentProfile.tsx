import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Trophy,
  School,
  Edit,
  Save,
  GraduationCap,
  Mail,
  Phone,
  User,
  BookOpen,
  Camera,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { toast } from "sonner@2.0.3";
import { dentalClasses, getClassesByYear } from "../utils/dentalClasses";
import { projectId } from "../utils/supabase/info";

export function StudentProfile({
  student,
  onBack,
  classes,
  onUpdateStudentClass,
}) {
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState(student?.classId || "");
  const classesByYear = getClassesByYear();

  const [profileData, setProfileData] = useState({
    name: student?.name || "",
    email: student?.email || "",
    phone: student?.phone || "",
    rollNumber: student?.rollNumber || "",
    batch: student?.batch || "",
    semester: student?.semester || "",
    bio: student?.bio || "Dedicated dental student passionate about learning.",
  });

  const handleClassUpdate = () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }
    const newClass = dentalClasses.find((c) => c.id === selectedClass);
    if (newClass) {
      onUpdateStudentClass(student.id, selectedClass, newClass.name);
      setIsEditingClass(false);
      toast.success(`Assigned to ${newClass.name}`);
    }
  };

  const handleProfileSave = () => {
    toast.success("Profile updated successfully!");
  };

  const initials = profileData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white">
                <AvatarImage src={student?.avatarUrl} />
                <AvatarFallback className="bg-white text-indigo-600 font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">{profileData.name}</h1>
                <p className="text-white/80 text-sm">{profileData.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="class" className="flex items-center gap-2">
              <School className="w-4 h-4" />
              Class
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Update your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        className="pl-10"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="pl-10 bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rollNumber">Roll Number</Label>
                    <Input
                      id="rollNumber"
                      value={profileData.rollNumber}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          rollNumber: e.target.value,
                        })
                      }
                      placeholder="e.g., DCP/2024/001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                        className="pl-10"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch">Batch</Label>
                    <Input
                      id="batch"
                      value={profileData.batch}
                      onChange={(e) =>
                        setProfileData({ ...profileData, batch: e.target.value })
                      }
                      placeholder="e.g., 2024-2028"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester</Label>
                    <Input
                      id="semester"
                      value={profileData.semester}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          semester: e.target.value,
                        })
                      }
                      placeholder="e.g., 4th Semester"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleProfileSave}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Class Tab */}
          <TabsContent value="class" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Class Assignment</CardTitle>
                <CardDescription>Manage your class enrollment</CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingClass ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="classSelect">Select Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger id="classSelect">
                          <SelectValue placeholder="Choose a class" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px]">
                          {Object.entries(classesByYear).map(([year, yearClasses]) => (
                            <React.Fragment key={year}>
                              <div className="px-2 py-1.5 text-xs font-bold text-indigo-600 uppercase bg-indigo-50">
                                {year}
                              </div>
                              {yearClasses.map((classItem) => (
                                <SelectItem
                                  key={classItem.id}
                                  value={classItem.id}
                                >
                                  {classItem.subject}
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleClassUpdate}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingClass(false);
                          setSelectedClass(student?.classId || "");
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                      <p className="text-sm font-semibold text-indigo-900">
                        Current Class
                      </p>
                      <p className="text-lg font-bold text-indigo-700 mt-1">
                        {student?.className || "Not assigned"}
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsEditingClass(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Change Class
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Academic Profile</CardTitle>
                <CardDescription>Your academic statistics and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-blue-600" />
                      <p className="text-sm font-semibold text-blue-900">Level</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">
                      {student?.currentLevel || 1}
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <p className="text-sm font-semibold text-purple-900">Total XP</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-700">
                      {student?.totalPoints || 0}
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-semibold text-green-900">Rank</p>
                    </div>
                    <p className="text-3xl font-bold text-green-700">
                      #{student?.rank || "—"}
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-900">Progress</p>
                    </div>
                    <p className="text-3xl font-bold text-amber-700">
                      {student?.courseProgress || 0}%
                    </p>
                  </div>
                </div>

                {student?.subjects && (
                  <div className="mt-6">
                    <p className="text-sm font-semibold mb-3">Subjects</p>
                    <div className="flex flex-wrap gap-2">
                      {student.subjects.map((subject, idx) => (
                        <Badge key={idx} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
