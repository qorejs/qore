import { join, resolve, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, readdirSync, renameSync, statSync } from 'fs'
import { copySync, ensureDirSync, removeSync } from 'fs-extra'
import prompts from 'prompts'
import { lightGreen, lightBlue, yellow, red } from 'kolorist'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface CreateOptions {
  template?: 'basic' | 'full' | 'library'
  typescript?: boolean
  git?: boolean
  install?: boolean
}

/**
 * Create a new Qore project
 */
export async function create(
  projectName: string,
  options: CreateOptions = {}
): Promise<void> {
  const cwd = process.cwd()
  const targetDir = resolve(cwd, projectName)
  
  // Check if directory exists
  if (existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory "${projectName}" already exists. Overwrite?`,
      initial: false,
    })
    
    if (!overwrite) {
      console.log(red('✗') + ' Operation cancelled')
      process.exit(0)
    }
    
    // Remove existing directory
    removeSync(targetDir)
  }
  
  // Get template if not specified
  let template = options.template
  if (!template) {
    const { selectedTemplate } = await prompts({
      type: 'select',
      name: 'selectedTemplate',
      message: 'Select a template:',
      choices: [
        {
          title: 'Basic',
          description: 'Minimal Qore app',
          value: 'basic',
        },
        {
          title: 'Full',
          description: 'Complete app with components and routing',
          value: 'full',
        },
        {
          title: 'Library',
          description: 'Component library',
          value: 'library',
        },
      ],
      initial: 0,
    })
    
    template = selectedTemplate || 'basic'
  }
  
  // Ensure template is defined
  if (!template) {
    console.log(red('✗') + ' No template selected')
    process.exit(1)
  }
  
  // Get options if not specified
  const useTypeScript = options.typescript ?? true
  const useGit = options.git ?? true
  const useInstall = options.install ?? true
  
  console.log()
  console.log(lightGreen('✓') + ` Creating ${lightBlue(projectName)}...`)
  
  // Create directory
  ensureDirSync(targetDir)
  
  // Copy template files
  const templateDir = resolve(__dirname, '../../templates', template)
  copyTemplate(templateDir, targetDir, projectName, useTypeScript)
  
  // Initialize Git
  if (useGit) {
    console.log(lightGreen('✓') + ' Initializing Git repository...')
    try {
      execSync('git init', { cwd: targetDir, stdio: 'ignore' })
      execSync('git add .', { cwd: targetDir, stdio: 'ignore' })
      execSync('git commit -m "Initial commit from create-qore"', { 
        cwd: targetDir, 
        stdio: 'ignore' 
      })
    } catch (error) {
      console.log(yellow('⚠') + ' Git initialization failed')
    }
  }
  
  // Install dependencies
  if (useInstall) {
    console.log(lightGreen('✓') + ' Installing dependencies...')
    try {
      execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' })
    } catch (error) {
      console.log(yellow('⚠') + ' Dependency installation failed')
    }
  }
  
  // Print success message
  console.log()
  console.log(lightGreen('✓') + ' Project created successfully!')
  console.log()
  console.log(`  cd ${lightBlue(projectName)}`)
  console.log(`  pnpm dev`)
  console.log()
}

/**
 * Copy template files to target directory
 */
function copyTemplate(
  templateDir: string,
  targetDir: string,
  projectName: string,
  useTypeScript: boolean
): void {
  // Copy all template files
  copySync(templateDir, targetDir)
  
  // Update package.json
  const packageJsonPath = join(targetDir, 'package.json')
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf-8')
  )
  
  packageJson.name = projectName
  packageJson.version = '0.0.0'
  
  writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n'
  )
  
  // Rename files if needed
  const ext = useTypeScript ? 'ts' : 'js'
  renameFiles(targetDir, ext)
}

/**
 * Rename files based on TypeScript preference
 */
function renameFiles(dir: string, ext: string): void {
  const files = readdirSync(dir)
  
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    
    if (stat.isDirectory()) {
      renameFiles(filePath, ext)
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      // Keep the extension as is for now
      // Could rename .ts to .js if not using TypeScript
    }
  }
}
