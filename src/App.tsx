import { useState } from 'react'
import './App.css'
import { loadXML } from './loadXML'

function App() {
    const [llr, setLlr] = useState("")

  (async ()=>{
    const data = await loadXML();
    setLlr(data);
  })();

  return (
    <div className="App">
      <header className="App-header">
        <p>LLR Reader</p>
        <div>{llr}</div>
      </header>
    </div>
  )
}

export default App
