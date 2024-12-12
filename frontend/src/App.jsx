import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import axios from 'axios';
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [randomNumber, setRandomNumber] = useState(0)

  let nodeenv = process.env.NODE_ENV;

  const getRandomNumber = () => {
    const baseURL = process.env.REACT_APP_API_BASE_URL || '';
    let url = `${baseURL}/api/randomNumber/`;
    // console.log("axios get url: ", url);
    axios.get(url)
      .then(response => {
        // console.log("response.data: ", response.data);
        setRandomNumber(response.data.random_number);
      })
      .catch(error => {
        console.error('There was an error making the request!', error);
      });
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>You are in {nodeenv}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <div className="card">
        <button onClick={getRandomNumber}>
          Fetch new random number from backend: {randomNumber}
        </button>
      </div>
    </>
  )
}

export default App
