import { useState, useMemo } from "react";
import { Badge } from "./badge";
import { Input } from "./input";
import { Label } from "./label";
import { X, Search, Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Button } from "./button";

interface Category {
  id: number;
  name: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: number[];
  onCategoryChange: (categoryIds: number[]) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const CategorySelector = ({
  categories,
  selectedCategoryIds,
  onCategoryChange,
  disabled = false,
  label = "Categories",
  placeholder = "Search categories...",
  required = false,
  className = "",
}: CategorySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  // Get selected categories
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => selectedCategoryIds.includes(cat.id));
  }, [categories, selectedCategoryIds]);

  // Handle category toggle
  const toggleCategory = (categoryId: number) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoryChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onCategoryChange([...selectedCategoryIds, categoryId]);
    }
  };

  // Handle category removal
  const removeCategory = (categoryId: number) => {
    onCategoryChange(selectedCategoryIds.filter((id) => id !== categoryId));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
          {selectedCategories.map((cat) => (
            <Badge
              key={cat.id}
              variant="secondary"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
            >
              <span>{cat.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCategory(cat.id)}
                  className="ml-1 hover:text-destructive transition-colors rounded-full hover:bg-destructive/10 p-0.5"
                  aria-label={`Remove ${cat.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Category Selector Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-start text-left font-normal h-11 border-border/50 hover:bg-muted/50"
          >
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            {selectedCategories.length > 0 ? (
              <span className="text-muted-foreground">
                {selectedCategories.length}{" "}
                {selectedCategories.length === 1 ? "category" : "categories"}{" "}
                selected
              </span>
            ) : (
              <span className="text-muted-foreground">Select categories</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0"
          align="start"
          sideOffset={5}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col h-auto">
            {/* Search Input */}
            <div className="p-3 border-b border-border/50 bg-muted/30 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-background"
                  autoFocus
                />
              </div>
            </div>

            {/* Categories List - Fixed height with scroll */}
            <div
              className="overflow-y-scroll overflow-x-hidden h-[300px] nice-scrollbar"
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {filteredCategories.length > 0 ? (
                <div className="p-2 grid grid-cols-1 gap-1">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-muted/50 ${
                          isSelected
                            ? "bg-primary/5 border border-primary/20"
                            : "border border-transparent"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-colors ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="h-3 w-3 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {cat.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Tag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No categories found
                  </p>
                  {searchQuery && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Try a different search term
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer with count */}
            {filteredCategories.length > 0 && (
              <div className="p-3 border-t border-border/50 bg-muted/30 flex-shrink-0">
                <p className="text-xs text-muted-foreground text-center">
                  {selectedCategories.length} of {categories.length} categories
                  selected
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedCategories.length === 0 && required && (
        <p className="text-xs text-muted-foreground">
          Please select at least one category
        </p>
      )}
    </div>
  );
};
