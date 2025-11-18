import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Warning, Bug, Wrench, Play } from '@phosphor-icons/react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DiagnosticResult {
  category: string
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  fix?: () => void
}

export function AppDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    const diagnostics: DiagnosticResult[] = []

    try {
      diagnostics.push({
        category: 'Storage',
        name: 'KV Storage Access',
        status: await testKVStorage() ? 'pass' : 'fail',
        message: await testKVStorage() ? 'KV storage is accessible' : 'KV storage is not accessible'
      })
    } catch (e) {
      diagnostics.push({
        category: 'Storage',
        name: 'KV Storage Access',
        status: 'fail',
        message: `KV storage error: ${e}`
      })
    }

    try {
      diagnostics.push({
        category: 'API',
        name: 'Spark Global Object',
        status: typeof window.spark !== 'undefined' ? 'pass' : 'fail',
        message: typeof window.spark !== 'undefined' ? 'Spark API is loaded' : 'Spark API is not available'
      })
    } catch (e) {
      diagnostics.push({
        category: 'API',
        name: 'Spark Global Object',
        status: 'fail',
        message: `Spark API error: ${e}`
      })
    }

    try {
      const hasLLM = typeof window.spark?.llm === 'function'
      diagnostics.push({
        category: 'API',
        name: 'LLM Function',
        status: hasLLM ? 'pass' : 'fail',
        message: hasLLM ? 'LLM function is available' : 'LLM function is not available'
      })
    } catch (e) {
      diagnostics.push({
        category: 'API',
        name: 'LLM Function',
        status: 'fail',
        message: `LLM function error: ${e}`
      })
    }

    try {
      const hasUser = typeof window.spark?.user === 'function'
      diagnostics.push({
        category: 'API',
        name: 'User Function',
        status: hasUser ? 'pass' : 'fail',
        message: hasUser ? 'User function is available' : 'User function is not available'
      })
    } catch (e) {
      diagnostics.push({
        category: 'API',
        name: 'User Function',
        status: 'fail',
        message: `User function error: ${e}`
      })
    }

    try {
      const hasSpeechSynthesis = 'speechSynthesis' in window
      diagnostics.push({
        category: 'Browser',
        name: 'Speech Synthesis',
        status: hasSpeechSynthesis ? 'pass' : 'warning',
        message: hasSpeechSynthesis ? 'Speech synthesis is supported' : 'Speech synthesis is not supported'
      })
    } catch (e) {
      diagnostics.push({
        category: 'Browser',
        name: 'Speech Synthesis',
        status: 'warning',
        message: `Speech synthesis check error: ${e}`
      })
    }

    try {
      const hasLocalStorage = typeof localStorage !== 'undefined'
      diagnostics.push({
        category: 'Browser',
        name: 'Local Storage',
        status: hasLocalStorage ? 'pass' : 'warning',
        message: hasLocalStorage ? 'Local storage is available' : 'Local storage is not available'
      })
    } catch (e) {
      diagnostics.push({
        category: 'Browser',
        name: 'Local Storage',
        status: 'warning',
        message: `Local storage check error: ${e}`
      })
    }

    try {
      const hasFramerMotion = await import('framer-motion').then(() => true).catch(() => false)
      diagnostics.push({
        category: 'Dependencies',
        name: 'Framer Motion',
        status: hasFramerMotion ? 'pass' : 'fail',
        message: hasFramerMotion ? 'Framer Motion is loaded' : 'Framer Motion failed to load'
      })
    } catch (e) {
      diagnostics.push({
        category: 'Dependencies',
        name: 'Framer Motion',
        status: 'fail',
        message: `Framer Motion error: ${e}`
      })
    }

    try {
      const hasPhosphor = await import('@phosphor-icons/react').then(() => true).catch(() => false)
      diagnostics.push({
        category: 'Dependencies',
        name: 'Phosphor Icons',
        status: hasPhosphor ? 'pass' : 'fail',
        message: hasPhosphor ? 'Phosphor Icons are loaded' : 'Phosphor Icons failed to load'
      })
    } catch (e) {
      diagnostics.push({
        category: 'Dependencies',
        name: 'Phosphor Icons',
        status: 'fail',
        message: `Phosphor Icons error: ${e}`
      })
    }

    try {
      const hasShadcn = await import('@/components/ui/button').then(() => true).catch(() => false)
      diagnostics.push({
        category: 'Dependencies',
        name: 'Shadcn Components',
        status: hasShadcn ? 'pass' : 'fail',
        message: hasShadcn ? 'Shadcn components are loaded' : 'Shadcn components failed to load'
      })
    } catch (e) {
      diagnostics.push({
        category: 'Dependencies',
        name: 'Shadcn Components',
        status: 'fail',
        message: `Shadcn components error: ${e}`
      })
    }

    setResults(diagnostics)
    setIsRunning(false)
  }

  const testKVStorage = async (): Promise<boolean> => {
    try {
      if (!window.spark?.kv) return false
      
      await window.spark.kv.set('diagnostic-test', { test: true })
      const result = await window.spark.kv.get<{ test: boolean }>('diagnostic-test')
      await window.spark.kv.delete('diagnostic-test')
      
      return result?.test === true
    } catch {
      return false
    }
  }

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" weight="fill" />
      case 'warning':
        return <Warning className="w-5 h-5 text-yellow-500" weight="fill" />
    }
  }

  const getStatusBadge = (status: 'pass' | 'fail' | 'warning') => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary'
    }
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, DiagnosticResult[]>)

  const totalTests = results.length
  const passedTests = results.filter(r => r.status === 'pass').length
  const failedTests = results.filter(r => r.status === 'fail').length
  const warningTests = results.filter(r => r.status === 'warning').length

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-mid/20 to-accent/20 border border-blue-mid/30">
          <Bug className="w-8 h-8 text-blue-mid" weight="duotone" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-heading">FlowSphere Diagnostics</h1>
          <p className="text-muted-foreground">Automatic troubleshooting and health check</p>
        </div>
      </div>

      <Alert className="mb-6">
        <Wrench className="w-5 h-5" />
        <AlertDescription>
          This tool runs comprehensive checks on FlowSphere's core functionality to identify and diagnose potential issues.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-3 mb-6">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          size="lg"
          className="gap-2"
        >
          <Play className="w-5 h-5" weight="fill" />
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {results.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
              <span className="font-medium">{passedTests}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" weight="fill" />
              <span className="font-medium">{failedTests}</span>
            </div>
            <div className="flex items-center gap-2">
              <Warning className="w-5 h-5 text-yellow-500" weight="fill" />
              <span className="font-medium">{warningTests}</span>
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {Object.entries(groupedResults).map(([category, categoryResults]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-xl">{category}</CardTitle>
                  <CardDescription>
                    {categoryResults.filter(r => r.status === 'pass').length} / {categoryResults.length} checks passed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryResults.map((result, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
                    >
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{result.name}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {results.length === 0 && !isRunning && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bug className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <p className="text-muted-foreground">
              Click "Run Diagnostics" to start troubleshooting
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
