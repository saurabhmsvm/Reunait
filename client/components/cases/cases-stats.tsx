"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Search, CheckCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react"

interface CasesStatsProps {
  stats: {
    totalCases: number
    missingCases: number
    foundCases: number
    closedCases: number
    successRate: number
    recentActivity: number
  }
  loading?: boolean
}

export function CasesStats({ stats, loading = false }: CasesStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Cases",
      value: stats.totalCases,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "Missing Persons",
      value: stats.missingCases,
      icon: Search,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    {
      title: "Successfully Found",
      value: stats.foundCases,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    }
  ]

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className={`border-2 ${stat.borderColor} hover:shadow-md transition-shadow`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-2 border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Recent Activity
              </CardTitle>
              <div className="p-2 rounded-lg bg-orange-50">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.recentActivity}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              New cases this week
            </p>
          </CardContent>
        </Card>

        {/* Closed Cases */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Closed Cases
              </CardTitle>
              <div className="p-2 rounded-lg bg-gray-50">
                <AlertTriangle className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.closedCases}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Cases closed this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate Badge */}
      <div className="flex justify-center">
        <Badge 
          variant="secondary" 
          className="text-lg px-6 py-3 bg-gradient-to-r from-green-100 to-blue-100 text-gray-800 border-green-200"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Overall Success Rate: {stats.successRate}%
        </Badge>
      </div>
    </div>
  )
} 