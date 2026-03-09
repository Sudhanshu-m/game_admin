import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  Save,
  Camera,
} from "lucide-react";
import { toast } from "sonner@2.0.3";

export function StudentProfile({ student, onBack }) {
  const [profileData, setProfileData] = useState({
    name: student?.name || "",
    email: student?.email || "",
    username: student?.username || "",
    rollNumber: student?.rollNumber || "",
    batch: student?.batch || "",
    class: "",
    phone: "",
    department: "",
    semester: "",
  });

  const handleSave = () => {
    toast.success("Profile updated successfully!");
  };

  const initials = profileData.name
    ? profileData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Back Button */}
        <Button onClick={onBack} variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Profile Header */}
        <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white/20">
                <AvatarImage src={student?.avatarUrl} />
                <AvatarFallback className="text-xl bg-white text-indigo-600 font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-white/20 hover:bg-white/30"
              >
                <Camera className="w-5 h-5 text-white" />
              </Button>
            </div>

            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold">
                {profileData.name || "Student"}
              </h1>
              <p className="text-white/80">
                {student?.rollNumber || "Student"}
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-slate-900">
            Profile Information
          </h2>
          <p className="text-slate-600">
            Update your personal and academic details
          </p>
        </div>

        {/* Form */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="pl-10 bg-slate-50"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={profileData.email}
                  disabled
                  className="pl-10 bg-slate-100"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="pl-10 bg-slate-50"
                />
              </div>
            </div>

            {/* Roll Number */}
            <div className="space-y-2">
              <Label>Roll Number</Label>
              <Input
                value={profileData.rollNumber}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    rollNumber: e.target.value,
                  })
                }
                className="bg-slate-50"
              />
            </div>

            {/* Batch */}
            <div className="space-y-2">
              <Label>Batch</Label>
              <Input
                value={profileData.batch}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, batch: e.target.value }))
                }
                className="bg-slate-50"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department</Label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={profileData.department}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      department: e.target.value,
                    })
                  }
                  className="pl-10 bg-slate-50"
                />
              </div>
            </div>

            {/* Specialization */}
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                value={profileData.specialization}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    specialization: e.target.value,
                  })
                }
                className="bg-slate-50"
              />
            </div>

            {/* Qualification */}
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input
                value={profileData.qualification}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    qualification: e.target.value,
                  })
                }
                className="bg-slate-50"
              />
            </div>

            {/* Join Date */}
            <div className="space-y-2">
              <Label>Join Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={profileData.joinDate}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      joinDate: e.target.value,
                    })
                  }
                  className="pl-10 bg-slate-50"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={profileData.address}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      address: e.target.value,
                    })
                  }
                  className="pl-10 bg-slate-50"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                rows={4}
                value={profileData.bio}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="bg-slate-50 resize-none"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
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
