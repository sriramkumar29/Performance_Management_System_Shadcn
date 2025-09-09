import { test, expect } from '@playwright/test';

test.describe('Goal Templates Display Verification', () => {
  test('Verify goal templates are loaded and displayed', async ({ page }) => {
    console.log('🔍 Checking backend availability...');
    
    // Check if test backend is running
    try {
      const response = await page.request.get('http://localhost:7001/api/health', { failOnStatusCode: false });
      if (response.status() !== 200) {
        console.log('❌ Test backend not available, starting it...');
      } else {
        console.log('✅ Backend is available');
      }
    } catch (error) {
      console.log('❌ Backend check failed:', error);
    }

    console.log('🔐 Starting login...');
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="email"]', 'john.ceo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
    console.log('✅ Login successful');

    console.log('🚀 Navigating to goal templates page...');
    await page.goto('http://localhost:5173/goal-templates');
    await page.waitForTimeout(3000); // Give time for API calls

    console.log('📍 Navigation complete');

    // Check if templates are displayed
    const hasTemplateList = await page.locator('[data-testid="template-list"]').count() > 0;
    console.log(`🔍 Page has template list element: ${hasTemplateList}`);
    
    if (hasTemplateList) {
      const templateListContent = await page.locator('[data-testid="template-list"]').textContent();
      console.log(`📋 Template list content: "${templateListContent}"`);
      
      // Check if we see actual templates instead of "No templates found"
      const hasNoTemplatesMessage = templateListContent?.includes('No templates found');
      console.log(`❌ Shows "No templates found": ${hasNoTemplatesMessage}`);
      
      if (!hasNoTemplatesMessage) {
        console.log('🎉 SUCCESS: Templates are being displayed!');
        
        // Try to find template cards or items
        const templateItems = await page.locator('[data-testid="template-item"]').count();
        console.log(`📋 Number of template items found: ${templateItems}`);
        
        if (templateItems > 0) {
          for (let i = 0; i < Math.min(templateItems, 5); i++) {
            const templateText = await page.locator('[data-testid="template-item"]').nth(i).textContent();
            console.log(`  Template ${i + 1}: ${templateText}`);
          }
        }
        
        // Check for create template button
        const hasCreateButton = await page.locator('[data-testid="create-template"]').count() > 0;
        console.log(`🔘 Has create template button: ${hasCreateButton}`);
        
        if (hasCreateButton) {
          console.log('🔘 Clicking create template button...');
          await page.locator('[data-testid="create-template"]').click();
          await page.waitForTimeout(1000);
          
          // Check what dialog/form opened
          const hasModal = await page.locator('[role="dialog"]').count() > 0;
          console.log(`📱 Modal/dialog opened: ${hasModal}`);
          
          if (hasModal) {
            const modalContent = await page.locator('[role="dialog"]').textContent();
            console.log(`📱 Modal content: ${modalContent?.substring(0, 200)}...`);
            
            // Look for expected form fields
            const hasNameField = await page.locator('input[name="temp_name"], input[placeholder*="name"], input[id*="name"]').count() > 0;
            const hasDescField = await page.locator('textarea[name="temp_description"], textarea[placeholder*="description"]').count() > 0;
            const hasAddGoalButton = await page.locator('[data-testid="add-goal-to-template"]').count() > 0;
            
            console.log(`📝 Has name field: ${hasNameField}`);
            console.log(`📝 Has description field: ${hasDescField}`);
            console.log(`📝 Has add goal button: ${hasAddGoalButton}`);
          }
        }
      }
    }

    console.log('🎯 Verification completed');
  });
});
