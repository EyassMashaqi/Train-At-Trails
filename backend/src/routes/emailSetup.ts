import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Email template validation
const validateEmailTemplate = (template: any) => {
  const errors: string[] = [];
  
  if (!template.name?.trim()) errors.push('Name is required');
  if (!template.subject?.trim()) errors.push('Subject is required');
  if (!template.htmlContent?.trim()) errors.push('HTML content is required');
  if (!template.emailType) errors.push('Email type is required');
  
  // Validate colors (basic hex color validation)
  const colorFields = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'buttonColor'];
  colorFields.forEach(field => {
    if (template[field] && !/^#[0-9A-F]{6}$/i.test(template[field])) {
      errors.push(`${field} must be a valid hex color (e.g., #FF0000)`);
    }
  });
  
  return errors;
};

// GLOBAL EMAIL TEMPLATES

// Get all global email templates
router.get('/global-templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await prisma.globalEmailTemplate.findMany({
      orderBy: { emailType: 'asc' }
    });
    
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching global email templates:', error);
    res.status(500).json({ error: 'Failed to fetch global email templates' });
  }
});

// Get single global email template
router.get('/global-templates/:emailType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { emailType } = req.params;
    
    const template = await prisma.globalEmailTemplate.findUnique({
      where: { emailType: emailType as any }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error fetching global email template:', error);
    res.status(500).json({ error: 'Failed to fetch global email template' });
  }
});

// Update global email template
router.put('/global-templates/:emailType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { emailType } = req.params;
    const templateData = req.body;
    
    // Validate input
    const errors = validateEmailTemplate(templateData);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    const template = await prisma.globalEmailTemplate.update({
      where: { emailType: emailType as any },
      data: {
        name: templateData.name.trim(),
        description: templateData.description?.trim() || null,
        subject: templateData.subject.trim(),
        htmlContent: templateData.htmlContent.trim(),
        textContent: templateData.textContent?.trim() || null,
        primaryColor: templateData.primaryColor || '#3B82F6',
        secondaryColor: templateData.secondaryColor || '#1E40AF',
        backgroundColor: templateData.backgroundColor || '#F8FAFC',
        textColor: templateData.textColor || '#1F2937',
        buttonColor: templateData.buttonColor || '#3B82F6',
        isActive: templateData.isActive ?? true
      }
    });
    
    res.json({ template, message: 'Global email template updated successfully' });
  } catch (error) {
    console.error('Error updating global email template:', error);
    res.status(500).json({ error: 'Failed to update global email template' });
  }
});

// COHORT-SPECIFIC EMAIL CONFIGS

// Get all email configs for a cohort
router.get('/cohorts/:cohortId/email-configs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;
    
    // Verify cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId }
    });
    
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }
    
    const configs = await prisma.cohortEmailConfig.findMany({
      where: { cohortId },
      orderBy: { emailType: 'asc' }
    });
    
    res.json({ configs, cohort });
  } catch (error) {
    console.error('Error fetching cohort email configs:', error);
    res.status(500).json({ error: 'Failed to fetch cohort email configs' });
  }
});

// Get single email config for a cohort
router.get('/cohorts/:cohortId/email-configs/:emailType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId, emailType } = req.params;
    
    const config = await prisma.cohortEmailConfig.findUnique({
      where: { 
        cohortId_emailType: { 
          cohortId, 
          emailType: emailType as any 
        } 
      },
      include: { cohort: true }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Email config not found' });
    }
    
    res.json({ config });
  } catch (error) {
    console.error('Error fetching cohort email config:', error);
    res.status(500).json({ error: 'Failed to fetch cohort email config' });
  }
});

// Update cohort email config
router.put('/cohorts/:cohortId/email-configs/:emailType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId, emailType } = req.params;
    const configData = req.body;
    
    // Validate input
    const errors = validateEmailTemplate(configData);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    const config = await prisma.cohortEmailConfig.update({
      where: { 
        cohortId_emailType: { 
          cohortId, 
          emailType: emailType as any 
        } 
      },
      data: {
        name: configData.name.trim(),
        description: configData.description?.trim() || null,
        subject: configData.subject.trim(),
        htmlContent: configData.htmlContent.trim(),
        textContent: configData.textContent?.trim() || null,
        primaryColor: configData.primaryColor || '#3B82F6',
        secondaryColor: configData.secondaryColor || '#1E40AF',
        backgroundColor: configData.backgroundColor || '#F8FAFC',
        textColor: configData.textColor || '#1F2937',
        buttonColor: configData.buttonColor || '#3B82F6',
        isActive: configData.isActive ?? true
      }
    });
    
    res.json({ config, message: 'Cohort email config updated successfully' });
  } catch (error) {
    console.error('Error updating cohort email config:', error);
    res.status(500).json({ error: 'Failed to update cohort email config' });
  }
});

// Copy global templates to new cohort (used during cohort creation)
router.post('/cohorts/:cohortId/copy-global-templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;
    
    // Verify cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId }
    });
    
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }
    
    // Check if templates already exist for this cohort
    const existingConfigs = await prisma.cohortEmailConfig.findMany({
      where: { cohortId }
    });
    
    if (existingConfigs.length > 0) {
      return res.status(400).json({ error: 'Email configs already exist for this cohort' });
    }
    
    // Get all global templates
    const globalTemplates = await prisma.globalEmailTemplate.findMany();
    
    // Create cohort-specific configs from global templates
    const configs = await prisma.cohortEmailConfig.createMany({
      data: globalTemplates.map(template => ({
        cohortId,
        emailType: template.emailType,
        name: template.name,
        description: template.description,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        backgroundColor: template.backgroundColor,
        textColor: template.textColor,
        buttonColor: template.buttonColor,
        isActive: template.isActive
      }))
    });
    
    res.json({ 
      message: 'Global templates copied to cohort successfully',
      count: configs.count 
    });
  } catch (error) {
    console.error('Error copying global templates to cohort:', error);
    res.status(500).json({ error: 'Failed to copy global templates to cohort' });
  }
});

// Preview email with template variables
router.post('/preview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { htmlContent, variables, colors } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    // Replace template variables
    let processedHtml = htmlContent;
    
    // Replace color variables
    if (colors) {
      Object.entries(colors).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedHtml = processedHtml.replace(regex, value as string);
      });
    }
    
    // Replace other variables (for preview purposes, use sample data)
    const sampleVariables = {
      userName: 'John Doe',
      questionNumber: '1',
      questionTitle: 'Sample Question Title',
      grade: 'A+',
      feedback: 'Excellent work! Your answer demonstrates a clear understanding of the concepts.',
      miniQuestionTitle: 'Sample Mini Question',
      contentTitle: 'Sample Content',
      dashboardUrl: '#',
      resetUrl: '#',
      ...variables
    };
    
    Object.entries(sampleVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedHtml = processedHtml.replace(regex, value as string);
    });
    
    res.json({ previewHtml: processedHtml });
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: 'Failed to generate email preview' });
  }
});

export default router;