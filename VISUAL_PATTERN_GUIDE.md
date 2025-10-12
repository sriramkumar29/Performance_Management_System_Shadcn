# Visual Design Pattern Guide

## Quick Reference for Developers

This guide shows you exactly how to implement each design pattern with copy-paste examples.

---

## 🎨 Pattern 1: Page Container

**When to use**: Every page in the application

```tsx
<div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-fade-in">
  <div className="mx-auto max-w-7xl space-y-6">
    {/* Your page content here */}
  </div>
</div>
```

---

## 🎨 Pattern 2: Header Card

**When to use**: Top of every page

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect">
  <CardHeader className="pb-4">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Left side: Back button + Title */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline sm:ml-2">Back</span>
        </Button>
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Page Title
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Page description or subtitle
          </p>
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-3">
        <Button variant="default">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline sm:ml-2">Create New</span>
        </Button>
      </div>
    </div>
  </CardHeader>
</Card>
```

---

## 🎨 Pattern 3: Search & Filter Card

**When to use**: When page has searchable/filterable content

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-5 sm:p-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold text-foreground">
          Search Items
        </span>
      </div>
      <Badge
        variant="secondary"
        className="bg-blue-100 text-blue-700 border-blue-200 text-sm font-semibold px-3 py-1"
      >
        {itemCount} item(s)
      </Badge>
    </div>

    <div className="flex flex-wrap items-end gap-3">
      {/* Search input */}
      <div className="w-full md:w-1/2 lg:w-1/3">
        <Label className="mb-2 block text-sm font-medium">Search</Label>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter dropdowns */}
      <div className="w-full md:w-40">
        <Label className="mb-2 block text-sm font-medium">Filter</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🎨 Pattern 4: Filter Buttons with Count Badges

**When to use**: When you have multiple filter tabs

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <Button
    variant={activeFilter === "All" ? "default" : "outline"}
    onClick={() => setActiveFilter("All")}
  >
    All
    <Badge
      variant="secondary"
      className="ml-2 bg-slate-100 text-slate-700 border-0 font-semibold"
    >
      {allCount}
    </Badge>
  </Button>

  <Button
    variant={activeFilter === "Active" ? "default" : "outline"}
    onClick={() => setActiveFilter("Active")}
  >
    Active
    <Badge
      variant="secondary"
      className="ml-2 bg-blue-100 text-blue-700 border-0 font-semibold"
    >
      {activeCount}
    </Badge>
  </Button>

  <Button
    variant={activeFilter === "Completed" ? "default" : "outline"}
    onClick={() => setActiveFilter("Completed")}
  >
    Completed
    <Badge
      variant="secondary"
      className="ml-2 bg-green-100 text-green-700 border-0 font-semibold"
    >
      {completedCount}
    </Badge>
  </Button>

  <Button
    variant={activeFilter === "Draft" ? "default" : "outline"}
    onClick={() => setActiveFilter("Draft")}
  >
    Draft
    <Badge
      variant="secondary"
      className="ml-2 bg-amber-100 text-amber-700 border-0 font-semibold"
    >
      {draftCount}
    </Badge>
  </Button>

  <Button
    variant={activeFilter === "Overdue" ? "default" : "outline"}
    onClick={() => setActiveFilter("Overdue")}
  >
    Overdue
    <Badge
      variant="secondary"
      className="ml-2 bg-red-100 text-red-700 border-0 font-semibold"
    >
      {overdueCount}
    </Badge>
  </Button>
</div>
```

---

## 🎨 Pattern 5: Avatar with Label and Value

**When to use**: Displaying any key-value pair

```tsx
<div className="flex items-center gap-3">
  <Avatar className="h-10 w-10 bg-blue-50">
    <AvatarFallback className="bg-blue-50 text-blue-600">
      <Icon className="h-5 w-5" />
    </AvatarFallback>
  </Avatar>
  <div>
    <p className="text-sm text-primary font-medium">Label</p>
    <p className="text-base font-semibold text-foreground">Value</p>
  </div>
</div>
```

**Avatar colors by entity type**:

```tsx
// User/Employee
className="h-10 w-10 bg-blue-50"
<AvatarFallback className="bg-blue-50 text-blue-600">

// Manager/Appraiser
className="h-10 w-10 bg-primary/10"
<AvatarFallback className="bg-primary/10 text-primary">

// Reviewer/Senior
className="h-10 w-10 bg-purple-100"
<AvatarFallback className="bg-purple-100 text-purple-700">

// Document/Type
className="h-10 w-10 bg-emerald-50"
<AvatarFallback className="bg-emerald-50 text-emerald-600">

// Date/Period
className="h-10 w-10 bg-amber-50"
<AvatarFallback className="bg-amber-50 text-amber-600">

// Status/Due
className="h-10 w-10 bg-rose-50"
<AvatarFallback className="bg-rose-50 text-rose-600">

// Weight/Percentage
className="h-10 w-10 bg-purple-50"
<AvatarFallback className="bg-purple-50 text-purple-600">

// Performance/Metrics
className="h-10 w-10 bg-indigo-50"
<AvatarFallback className="bg-indigo-50 text-indigo-600">

// Category/Tag
className="h-10 w-10 bg-amber-50"
<AvatarFallback className="bg-amber-50 text-amber-600">
```

---

## 🎨 Pattern 6: Content Card with Absolute Action Buttons

**When to use**: List items, detail cards

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect border-l-4 border-l-blue-500 relative">
  <CardContent className="p-5 sm:p-6">
    {/* Reserve space for action buttons */}
    <div className="pr-24">
      {/* Your content here */}
      <div className="space-y-4">
        {/* Line 1 */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-blue-50">
            <AvatarFallback className="bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-primary font-medium mb-1">Title</p>
            <h3 className="text-xl font-semibold text-foreground">Item Name</h3>
          </div>
        </div>

        {/* Line 2 */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 bg-emerald-50">
            <AvatarFallback className="bg-emerald-50 text-emerald-600">
              <FileText className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-primary font-medium mb-1">Description</p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Description text goes here
            </p>
          </div>
        </div>

        {/* More lines as needed */}
      </div>
    </div>

    {/* Action buttons - positioned absolutely */}
    <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex gap-2">
      <Button variant="outline" size="sm" onClick={handleEdit}>
        <Edit className="h-4 w-4" />
        <span className="hidden sm:inline sm:ml-2">Edit</span>
      </Button>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline sm:ml-2">Delete</span>
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 🎨 Pattern 7: Status Progress Steps

**When to use**: Showing multi-step workflow progress

```tsx
<div className="space-y-3">
  <div className="flex items-center gap-2 mb-2">
    <TrendingUp className="h-4 w-4" />
    <span className="text-sm font-medium">Status</span>
  </div>

  <div className="relative">
    <div className="flex items-center justify-between">
      {[
        { label: "Submitted", status: "Submitted", progress: 20 },
        {
          label: "Self Assessment",
          status: "Appraisee Self Assessment",
          progress: 40,
        },
        {
          label: "Appraiser Evaluation",
          status: "Appraiser Evaluation",
          progress: 60,
        },
        {
          label: "Reviewer Evaluation",
          status: "Reviewer Evaluation",
          progress: 80,
        },
        { label: "Complete", status: "Complete", progress: 100 },
      ].map((step, idx) => {
        const currentProgress = getStatusProgress(currentStatus);
        const isCompleted = currentProgress > step.progress;
        const isCurrent = currentStatus === step.status;

        const circleClass = isCompleted
          ? "bg-primary text-primary-foreground"
          : isCurrent
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
          : "bg-muted text-muted-foreground border-2 border-muted-foreground/20";

        return (
          <div
            key={idx}
            className="flex flex-col items-center relative z-10 flex-1"
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${circleClass}`}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <span className="text-[10px] sm:text-xs">{idx + 1}</span>
              )}
            </div>
            <span className="text-[9px] sm:text-[11px] mt-1.5 text-center leading-tight max-w-[70px] sm:max-w-none">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>

    {/* Connecting line */}
    <div className="absolute top-4 sm:top-5 left-0 right-0 h-[2px] bg-muted -z-0 mx-4 sm:mx-5">
      <div
        className="h-full bg-primary transition-all duration-500"
        style={{ width: `${currentProgress}%` }}
      />
    </div>
  </div>
</div>
```

---

## 🎨 Pattern 8: Loading Skeleton

**When to use**: While data is loading

```tsx
<div className="space-y-4">
  {[1, 2, 3].map((i) => (
    <Card key={i} className="shadow-soft border-0 glass-effect">
      <CardContent className="p-5 sm:p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-5 w-1/3 rounded" />
            <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-5 w-16 rounded-full" />
          </div>
          <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-4 w-full rounded" />
          <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-4 w-5/6 rounded" />
          <div className="flex gap-2">
            <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-6 w-16 rounded-full" />
            <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-6 w-20 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 🎨 Pattern 9: Empty State

**When to use**: When no data is available

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-12 text-center">
    <div className="text-muted-foreground text-lg mb-2">No items found</div>
    <div className="text-sm text-muted-foreground">
      {searchQuery
        ? "Try adjusting your search criteria"
        : "Create your first item to get started"}
    </div>
  </CardContent>
</Card>
```

---

## 🎨 Pattern 10: Badge Variants

**Color-coded badges for status/filters**:

```tsx
// All/Neutral
<Badge className="bg-slate-100 text-slate-700 border-0 font-semibold">
  All
</Badge>

// Active/In Progress
<Badge className="bg-blue-100 text-blue-700 border-0 font-semibold">
  Active
</Badge>

// Success/Completed
<Badge className="bg-green-100 text-green-700 border-0 font-semibold">
  Completed
</Badge>

// Warning/Draft/Pending
<Badge className="bg-amber-100 text-amber-700 border-0 font-semibold">
  Draft
</Badge>

// Error/Overdue/Urgent
<Badge className="bg-red-100 text-red-700 border-0 font-semibold">
  Overdue
</Badge>

// Info/Secondary
<Badge className="bg-indigo-100 text-indigo-700 border-0 font-semibold">
  Info
</Badge>

// Category/Tag
<Badge className="bg-purple-100 text-purple-700 border-purple-200">
  Category
</Badge>
```

---

## 📦 Required Imports

Make sure these are imported in your component:

```tsx
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  User,
  UserCheck,
  Calendar,
  Clock,
  TrendingUp,
  Weight,
  Layers,
  CheckCircle,
} from "lucide-react";
```

---

## 🎯 Quick Tips

### Spacing

- Cards in a list: `space-y-4`
- Sections within a page: `space-y-6`
- Elements within a card: `space-y-3` or `space-y-4`
- Horizontal gaps: `gap-2`, `gap-3`, or `gap-4`

### Responsive Text

```tsx
<span className="hidden sm:inline sm:ml-2">Button Text</span>
```

### Responsive Width

```tsx
className = "w-full md:w-1/2 lg:w-1/3";
```

### Truncate Text

```tsx
className = "truncate"; // Single line
className = "line-clamp-2"; // Two lines
```

### Gradient Text

```tsx
className =
  "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent";
```

### Glass Effect

```tsx
className = "border-0 glass-effect shadow-soft hover-lift";
```

---

## ✅ Checklist for New Pages

When creating a new page, use this checklist:

- [ ] Page container with `min-h-screen`, responsive padding
- [ ] Header card with gradient title and back button
- [ ] Search/filter card if content is searchable
- [ ] Content cards with glass-effect and hover-lift
- [ ] Avatar icons with consistent colors
- [ ] Clear label → value hierarchy
- [ ] Action buttons absolutely positioned
- [ ] Loading skeletons for async data
- [ ] Empty state for no data
- [ ] Responsive breakpoints (sm, md, lg)
- [ ] Button text hidden on mobile
- [ ] Consistent spacing (gap-2, gap-3, gap-4)
- [ ] Status badges with proper colors

---

## 🚀 Getting Started

1. **Copy the pattern** you need from above
2. **Replace** placeholder text/values with your data
3. **Adjust colors** if needed (follow avatar color scheme)
4. **Test responsive** behavior on mobile, tablet, desktop
5. **Verify accessibility** (labels, aria-labels, keyboard nav)

---

## 📚 More Information

- **Full Design System**: See `DESIGN_SYSTEM_IMPLEMENTATION.md`
- **Redesign Details**: See `MANAGE_TEMPLATES_REDESIGN.md`
- **Complete Summary**: See `REDESIGN_SUMMARY.md`

---

Happy coding! 🎨✨
