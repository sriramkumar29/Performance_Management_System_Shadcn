/**
 * Standardized Button Styles and Configurations
 * 
 * This file defines consistent button variants, sizes, and class names
 * to be used throughout the application for a unified look and feel.
 */

// ============================================================================
// BUTTON VARIANTS & COLORS
// ============================================================================

export const BUTTON_VARIANTS = {
    // Destructive actions (Delete, Cancel, Remove, Close X)
    DESTRUCTIVE: 'destructive' as const,

    // Primary actions (Submit, Save, Confirm, Create, Continue)
    PRIMARY: 'default' as const,

    // Secondary/Neutral actions (Edit, View, Back, Save Draft)
    SECONDARY: 'outline' as const,

    // Subtle actions (collapse/expand, info buttons)
    GHOST: 'ghost' as const,

    // Links
    LINK: 'link' as const,

    // Special elevated style
    ELEVATED: 'elevated' as const,
} as const;

// ============================================================================
// BUTTON SIZES
// ============================================================================

export const BUTTON_SIZES = {
    SM: 'sm' as const,
    DEFAULT: 'default' as const,
    LG: 'lg' as const,
    ICON: 'icon' as const,
} as const;

// ============================================================================
// STANDARD BUTTON CLASSES BY ACTION TYPE
// ============================================================================

export const BUTTON_STYLES = {
    // ==========================================================================
    // DESTRUCTIVE BUTTONS (RED)
    // ==========================================================================

    /** Delete button (with trash icon) */
    DELETE: {
        variant: BUTTON_VARIANTS.DESTRUCTIVE,
        className: 'hover:shadow-glow transition-all',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Cancel button */
    CANCEL: {
        variant: BUTTON_VARIANTS.DESTRUCTIVE,
        className: 'hover:shadow-soft transition-all',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Close X button (icon only, circular) */
    CLOSE: {
        variant: BUTTON_VARIANTS.DESTRUCTIVE,
        size: BUTTON_SIZES.ICON,
        className: 'rounded-full hover:shadow-glow',
    },

    /** Remove button (for removing items from lists) */
    REMOVE: {
        variant: BUTTON_VARIANTS.DESTRUCTIVE,
        size: BUTTON_SIZES.SM,
        className: 'hover:shadow-glow',
    },

    /** Discard changes button */
    DISCARD: {
        variant: BUTTON_VARIANTS.DESTRUCTIVE,
        className: 'hover:shadow-soft',
        size: BUTTON_SIZES.DEFAULT,
    },

    // ==========================================================================
    // PRIMARY BUTTONS (FILLED, ACCENT COLOR)
    // ==========================================================================

    /** Primary submit button */
    SUBMIT: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Save button (primary action) */
    SAVE: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Create new button */
    CREATE: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Confirm button (in dialogs) */
    CONFIRM: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Continue/Next button */
    CONTINUE: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        size: BUTTON_SIZES.DEFAULT,
    },

    // ==========================================================================
    // SECONDARY/OUTLINE BUTTONS (BLUE BORDER)
    // ==========================================================================

    /** View button (blue border, outline style) */
    VIEW: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Edit button (outline style) */
    EDIT: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Save draft button (secondary save action) */
    SAVE_DRAFT: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'shadow-sm',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Back button (icon only, circular) */
    BACK: {
        variant: BUTTON_VARIANTS.SECONDARY,
        size: BUTTON_SIZES.ICON,
        className: 'rounded-full',
    },

    /** Cancel button (secondary style, non-destructive) */
    CANCEL_SECONDARY: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'hover:shadow-soft transition-shadow',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Add button (outline) */
    ADD: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'hover:shadow-soft',
        size: BUTTON_SIZES.SM,
    },

    /** Filter/Search buttons */
    FILTER: {
        variant: BUTTON_VARIANTS.SECONDARY,
        size: BUTTON_SIZES.DEFAULT,
        className: '',
    },

    // ==========================================================================
    // ACTION BUTTONS (SPECIAL CASES)
    // ==========================================================================

    /** Evaluate button (for appraisals) */
    EVALUATE: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Review button (for reviewer evaluation) */
    REVIEW: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Import button */
    IMPORT: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'hover:shadow-soft',
        size: BUTTON_SIZES.SM,
    },

    /** Export button */
    EXPORT: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: 'hover:shadow-soft',
        size: BUTTON_SIZES.SM,
    },

    // ==========================================================================
    // GHOST BUTTONS (MINIMAL STYLE)
    // ==========================================================================

    /** Toggle button (for expand/collapse) */
    TOGGLE: {
        variant: BUTTON_VARIANTS.GHOST,
        size: BUTTON_SIZES.SM,
        className: '',
    },

    /** Icon-only ghost button */
    GHOST_ICON: {
        variant: BUTTON_VARIANTS.GHOST,
        size: BUTTON_SIZES.ICON,
        className: 'rounded-full hover:bg-primary/10',
    },

    // ==========================================================================
    // PAGINATION BUTTONS
    // ==========================================================================

    /** Pagination previous/next buttons */
    PAGINATION: {
        variant: BUTTON_VARIANTS.GHOST,
        size: BUTTON_SIZES.ICON,
        className: 'rounded-full hover:bg-primary/10',
    },

    // ==========================================================================
    // TAB BUTTONS
    // ==========================================================================

    /** Active tab button */
    TAB_ACTIVE: {
        variant: BUTTON_VARIANTS.PRIMARY,
        className: 'bg-primary text-primary-foreground',
        size: BUTTON_SIZES.DEFAULT,
    },

    /** Inactive tab button */
    TAB_INACTIVE: {
        variant: BUTTON_VARIANTS.SECONDARY,
        className: '',
        size: BUTTON_SIZES.DEFAULT,
    },
} as const;

// ============================================================================
// ICON SIZES (to match button sizes)
// ============================================================================

export const ICON_SIZES = {
    SM: 'h-3 w-3',
    DEFAULT: 'h-4 w-4',
    LG: 'h-5 w-5',
    XL: 'h-6 w-6',
} as const;

// ============================================================================
// BUTTON SPACING (for button groups)
// ============================================================================

export const BUTTON_SPACING = {
    TIGHT: 'gap-2',
    DEFAULT: 'gap-3',
    LOOSE: 'gap-4',
} as const;

// ============================================================================
// MINIMUM WIDTHS (for consistency)
// ============================================================================

export const BUTTON_MIN_WIDTHS = {
    SM: 'min-w-[70px]',
    DEFAULT: 'min-w-[80px]',
    LG: 'min-w-[100px]',
    AUTO: '',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get button props for a specific action type
 * @param actionType - The type of action (from BUTTON_STYLES)
 * @param additionalClasses - Additional CSS classes to append
 */
export const getButtonProps = (
    actionType: keyof typeof BUTTON_STYLES,
    additionalClasses: string = ''
) => {
    const style = BUTTON_STYLES[actionType];
    return {
        variant: style.variant,
        size: style.size,
        className: `${style.className} ${additionalClasses}`.trim(),
    };
};

/**
 * Combine button classes with additional classes
 */
export const combineButtonClasses = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ');
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// Example 1: Delete button
<Button {...getButtonProps('DELETE')}>
  <Trash2 className={ICON_SIZES.DEFAULT} />
  Delete
</Button>

// Example 2: View button with custom width
<Button 
  variant={BUTTON_STYLES.VIEW.variant}
  size={BUTTON_STYLES.VIEW.size}
  className={combineButtonClasses(
    BUTTON_STYLES.VIEW.className,
    BUTTON_MIN_WIDTHS.DEFAULT
  )}
>
  <Eye className={ICON_SIZES.DEFAULT} />
  View
</Button>

// Example 3: Back button (icon only)
<Button
  variant={BUTTON_STYLES.BACK.variant}
  size={BUTTON_STYLES.BACK.size}
  className={BUTTON_STYLES.BACK.className}
>
  <ArrowLeft className={ICON_SIZES.DEFAULT} />
</Button>

// Example 4: Button group with standard spacing
<div className={`flex items-center ${BUTTON_SPACING.DEFAULT}`}>
  <Button {...getButtonProps('EDIT')}>Edit</Button>
  <Button {...getButtonProps('DELETE')}>Delete</Button>
</div>

*/
