import { useState, useEffect } from 'react'
import callIcon from './assets/call_48dp_E8EAED_FILL0_wght400_GRAD0_opsz48.svg'
import axios from 'axios';
import './App.css'
import { getCookie } from './js/utils';
import CSRFToken from './components/CSRFToken';

function App() {
  const [randomNumber, setRandomNumber] = useState(0)
  const [userId, setUserId] = useState(0)
  const baseURL = process.env.REACT_APP_API_BASE_URL || '';

  let nodeenv = process.env.NODE_ENV;

  useEffect(() => {
    // let url = `${baseURL}/api/set-csrf-cookie/`;
    // axios.get(url, { withCredentials: true }).catch(error => {
    //   console.error('Error fetching: ', error);
    // });

    let url = `${baseURL}/api/get-user-id/`;
    axios.get(url, { withCredentials: true })
      .then(response => {
        // console.log("response.data: ", response.data);
        setUserId(response.data.user_id)
      })
      .catch(error => {
        console.error('Error fetching: ', error);
      });
  }, []);

  const getRandomNumber = () => {
    let url = `${baseURL}/api/random-number/`;
    // console.log("axios get url: ", url);
    axios.get(url, { withCredentials: true })
      .then(response => {
        // console.log("response.data: ", response.data);
        setRandomNumber(response.data.random_number);
      })
      .catch(error => {
        console.error('Error fetching: ', error);
      });
  }

  const makeCall = async (e) => {
    e.preventDefault();
    let url = `${baseURL}/api/make-call/`;
    const formData = new FormData(e.target);
    const csrftoken = getCookie('csrftoken');
    // console.log('csrftoken:', csrftoken);
    // if (formData.get('csrfmiddlewaretoken') != csrftoken) {
    //   formData.set('csrfmiddlewaretoken', csrftoken);
    //   const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    //   if (csrfInput) {
    //     csrfInput.value = csrftoken;
    //   }
    // }

    axios.post(url, formData, {
      withCredentials: true,
      headers: {
        'X-CSRFToken': csrftoken
      }
    })
      .then(response => {
        console.log('Call made successfully:', response.data);
      })
      .catch(error => {
        console.error('Error making call:', error);
      });
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ height: '3em', padding: '1.5em' }}>
          <img src={callIcon} alt="call icon" />
        </div>
        <h1>{nodeenv} mode</h1>
      </div>
      <div style={{ padding: '2rem' }}>
        <p>Hello #{userId}</p>
        <button onClick={getRandomNumber}>
          Fetch new random number from backend: {randomNumber}
        </button>
      </div>
      <form onSubmit={makeCall}>
        <CSRFToken />
        <input type="text" name="phoneNumber" placeholder="Enter number to call" />
        <button type="submit">Call</button>
      </form>

      {/* <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div> */}

    </>
  )
}

export default App
