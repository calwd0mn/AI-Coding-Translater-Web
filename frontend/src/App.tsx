import './App.css'
import { ControlPanel } from './components/ControlPanel'
import { LogPanel } from './components/LogPanel'
import { OutputPanel } from './components/OutputPanel'
import { PipelineStrip } from './components/PipelineStrip'
import { ResultsSection } from './components/ResultsSection'
import { Sidebar } from './components/Sidebar'
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
    downloadTranscript,
    downloadTranslation,
    downloadSpeech,
  } = usePipeline()

  return (
    <div className="app-shell">
      <Sidebar
        state={state}
        canRun={canRun}
        onSourceLanguageChange={setSourceLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onSubmit={submitPipeline}
        onReset={resetPipeline}
      />

      <main className="main-content">
        <div className="workspace-grid">
          <section className="workspace-primary">
            <WorkspaceHeader />

            <ControlPanel state={state} onFileChange={selectFile} />

            {state.error && <p className="error-banner">{state.error}</p>}

            <PipelineStrip state={state} />
          </section>

          <section className="workspace-secondary">
            <ResultsSection
              state={state}
              onDownloadTranscript={downloadTranscript}
              onDownloadTranslation={downloadTranslation}
            />

            <OutputPanel state={state} onDownloadSpeech={downloadSpeech} />

            <LogPanel state={state} />
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
