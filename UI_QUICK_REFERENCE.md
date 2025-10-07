# UI Enhancement Quick Reference Guide

## 🎨 Enhanced Components

### Using Enhanced Buttons

```tsx
// Primary button with auto-scaling and shadow
<Button>Click Me</Button>

// Elevated button with extra shadow
<Button variant="elevated">Save</Button>

// Soft/subtle button
<Button variant="soft">Cancel</Button>

// With loading state
<Button loading loadingText="Saving...">Submit</Button>

// Different sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

### Using Enhanced Cards

```tsx
// Auto-animated card with hover lift
<Card className="hover-lift">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>

// Card with gradient border (from enhancements.css)
<Card className="card-gradient-border">
  <CardContent>Special content</CardContent>
</Card>

// Stat card with animated background
<Card className="stat-card">
  <CardContent>
    <div className="relative z-10">Statistics</div>
  </CardContent>
</Card>
```

### Using Enhanced Badges

```tsx
// Status badges with auto-animations
<Badge>Default</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>

// Pulsing notification badge
<Badge className="badge-pulse">New</Badge>
```

### Using Enhanced Inputs

```tsx
// Auto-enhanced input with focus effects
<Input
  placeholder="Enter text..."
  className="focus-ring-enhanced"
/>

// With icon (maintains all styling)
<div className="relative">
  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search..." />
</div>
```

### Using Enhanced Progress Bars

```tsx
// Gradient progress with smooth animation
<Progress value={75} />

// Custom color
<Progress
  value={50}
  className="[&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-green-600"
/>
```

## 🎭 Animation Classes

### Entrance Animations

```tsx
// Fade in
<div className="animate-fade-in">Content</div>

// Fade in with slide up
<div className="animate-fade-in-up">Content</div>

// Slide up
<div className="animate-slide-up">Content</div>

// Slide from right
<div className="animate-slide-in-right">Content</div>

// Scale in
<div className="animate-scale-in">Content</div>
```

### Hover Effects

```tsx
// Lift effect (cards)
<div className="hover-lift">Content</div>

// Scale effect (buttons/icons)
<div className="hover-scale">Content</div>

// Glow effect (special elements)
<div className="hover-glow">Content</div>
```

### Loading States

```tsx
// Shimmer loading
<div className="h-20 w-full shimmer rounded-lg" />

// Skeleton with gradient
<div className="skeleton-gradient h-4 w-full rounded" />

// Pulse
<div className="pulse-subtle">Loading...</div>
```

## 🎨 Gradient Utilities

### Background Gradients

```tsx
// Primary gradient
<div className="gradient-primary p-6 text-white rounded-xl">
  Content
</div>

// Accent gradient
<div className="gradient-accent p-6 text-white rounded-xl">
  Content
</div>

// Subtle gradient
<div className="gradient-subtle p-6 rounded-xl">
  Content
</div>
```

### Text Gradients

```tsx
// Static gradient text
<h1 className="text-gradient text-4xl font-bold">
  Gradient Title
</h1>

// Animated gradient text
<h1 className="gradient-text-animated text-4xl font-bold">
  Animated Title
</h1>
```

## 🌟 Glass Effects

### Glassmorphism

```tsx
// Standard glass effect (navbar, overlays)
<div className="glass-effect p-6 rounded-xl">
  Content
</div>

// Glass card
<div className="glass-card p-6 rounded-xl">
  Content
</div>
```

## 🎯 Shadow System

```tsx
// Soft shadow (subtle elevation)
<div className="shadow-soft">Content</div>

// Medium shadow (standard elevation)
<div className="shadow-medium">Content</div>

// Large shadow (high elevation)
<div className="shadow-large">Content</div>

// Glow shadow (interactive elements)
<div className="shadow-glow">Content</div>
```

## 🎪 Special Effects

### Button Effects

```tsx
// Button with glow effect
<Button className="button-glow">
  Glowing Button
</Button>

// Button with ripple effect
<Button className="ripple">
  Ripple Button
</Button>
```

### Icon Animations

```tsx
// Floating icon
<Icon className="float-icon" />

// Icon with theme-aware colors
<Calendar className="text-icon" />
<TrendingUp className="text-icon-strong" />

// Category-specific icons
<FileText className="icon-appraisal-type" />
<Clock className="icon-due-date" />
<CheckCircle className="icon-overall-progress" />
```

### Success States

```tsx
// Success animation
<div className="success-bounce">
  <CheckCircle className="h-12 w-12 text-success" />
</div>
```

## 📋 Page Layout

### Page Wrapper

```tsx
// Animated page content
<div className="page-transition">
  <h1 className="text-3xl font-bold text-gradient mb-6">Page Title</h1>
  <div className="animate-fade-in">{/* Content */}</div>
</div>
```

### Grid Layouts

```tsx
// Responsive card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card className="hover-lift">...</Card>
  <Card className="hover-lift">...</Card>
  <Card className="hover-lift">...</Card>
</div>
```

## 🎨 Color Tokens

### Using HSL Variables

```tsx
// Background colors
<div style={{ backgroundColor: 'hsl(var(--background))' }}>Content</div>

// Primary colors
<div style={{ backgroundColor: 'hsl(var(--primary))' }}>Content</div>

// With opacity
<div style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>Content</div>

// Gradient colors
<div style={{
  background: 'linear-gradient(135deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))'
}}>
  Content
</div>
```

## 🔧 Common Patterns

### Enhanced Card with Action

```tsx
<Card className="hover-lift transition-all duration-300">
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span>Title</span>
      <Badge variant="success">Active</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <Progress value={75} />
    <p className="text-sm text-muted-foreground">Description</p>
  </CardContent>
  <CardFooter>
    <Button className="w-full" variant="elevated">
      Take Action
    </Button>
  </CardFooter>
</Card>
```

### Enhanced Form

```tsx
<form className="space-y-6 animate-fade-in-up">
  <div className="space-y-2">
    <Label>Name</Label>
    <Input placeholder="Enter name..." />
  </div>

  <div className="space-y-2">
    <Label>Type</Label>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Type 1</SelectItem>
        <SelectItem value="2">Type 2</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div className="space-y-2">
    <Label>Description</Label>
    <Textarea placeholder="Enter description..." />
  </div>

  <div className="flex gap-3">
    <Button type="submit" className="flex-1">
      Submit
    </Button>
    <Button type="button" variant="outline" className="flex-1">
      Cancel
    </Button>
  </div>
</form>
```

### Enhanced Modal

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="elevated">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent className="animate-scale-in">
    <DialogHeader>
      <DialogTitle className="text-gradient">Enhanced Dialog</DialogTitle>
      <DialogDescription>This dialog has enhanced styling</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">{/* Content */}</div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="elevated">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 📱 Responsive Utilities

```tsx
// Show/hide based on screen size
<div className="hidden sm:block">Desktop content</div>
<div className="sm:hidden">Mobile content</div>

// Responsive padding
<div className="px-3 sm:px-6 lg:px-8">Content</div>

// Responsive text
<h1 className="text-xl sm:text-2xl lg:text-3xl">Title</h1>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {/* Items */}
</div>
```

## ⚡ Performance Tips

1. **Use CSS animations over JS** - All enhancements use CSS
2. **Respect reduced motion** - All animations include `motion-reduce:` variants
3. **Combine utility classes** - Use `hover-lift` instead of individual classes
4. **Use proper z-index** - Follow the established z-index scale
5. **Optimize re-renders** - Styling doesn't affect component logic

## 🎯 Best Practices

1. **Consistency** - Use provided utility classes for uniform appearance
2. **Accessibility** - Always include ARIA labels and keyboard support
3. **Performance** - Apply animations to specific elements, not entire pages
4. **Mobile-first** - Start with mobile styles, enhance for desktop
5. **Theme-aware** - Use CSS variables for colors, not hardcoded values

---

**Need Help?** Refer to `UI_ENHANCEMENTS.md` for comprehensive documentation.
