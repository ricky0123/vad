import ReactDOM from "react-dom"

const domContainer = document.querySelector("#root")
const root = ReactDOM.createRoot(domContainer)
root.render(<App />)

function App() {
  return <div>Hello world</div>
}
