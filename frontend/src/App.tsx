import './App.css'
import { ControlPanel } from './components/ControlPanel'
import { LogPanel } from './components/LogPanel'
import { OutputPanel } from './components/OutputPanel'
import { PipelineStrip } from './components/PipelineStrip'
import { ResultsSection } from './components/ResultsSection'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import { usePipeline } from './hooks/usePipeline'

function App() {
  const {
    state,
    canRun,
    selectFile,
    setSourceLanguage,
    setTargetLanguage,
    submitPipeline,
    resetPipeline,
    downloadTranslation,
    downloadSpeech,
  } = usePipeline()

  return (
    <main className="app-shell">
      <section className="workspace">
        <WorkspaceHeader
          disabled={state.status === 'running'}
          onReset={resetPipeline}
        />

        <ControlPanel
          state={state}
          canRun={canRun}
          onFileChange={selectFile}
          onSourceLanguageChange={setSourceLanguage}
          onTargetLanguageChange={setTargetLanguage}
          onSubmit={submitPipeline}
        />

        {state.error && <p className="error-banner">{state.error}</p>}

        <PipelineStrip state={state} />

        <ResultsSection
          state={state}
          onDownloadTranslation={downloadTranslation}
        />

        <OutputPanel state={state} onDownloadSpeech={downloadSpeech} />

        <LogPanel state={state} />
      </section>
    </main>
  )
}

export default App
