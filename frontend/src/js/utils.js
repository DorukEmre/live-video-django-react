import {
  copyIcon, checkIcon
} from './images';

import axios from 'axios';

// async function fetchCsrfToken() {
//  const baseURL = (process.env.NODE_ENV === "production") ? process.env.REACT_APP_API_BASE_URL : process.env.REACT_APP_API_BASE_URL_DEV;
//   let url = `${baseURL}/api/set-csrf-cookie/`;

//   try {
//     const response = await axios.get(url, { withCredentials: true });
//     console.log('response.data: ', response.data);
//     const csrfToken = response.data.csrf_token;
//     return csrfToken;
//   } catch (error) {
//     console.error('Error fetching CSRF cookie:', error);
//     return null;
//   }
// }

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  // if (cookieValue === null && name === 'csrftoken') {
  // cookieValue = await fetchCsrfToken();
  // console.log("cookieValue: ", cookieValue);
  // }
  return cookieValue;
}

const copyNumber = (e) => {
  // Copy user phone to clipboard
  const userPhone = document.getElementById('spanUserPhone').innerText;
  navigator.clipboard.writeText(userPhone);

  // Temporarily update copy button
  const copyButton = document.getElementById('copyButton');
  if (copyButton) {
    const img = copyButton.querySelector('img');
    if (img) {
      img.src = checkIcon;
      img.alt = 'check icon';
      img.title = 'Copied';
      setTimeout(() => {
        img.src = copyIcon;
        img.alt = 'copy icon';
        img.title = 'Copy number';
      }, 1000);
    }
  }
}

export { getCookie, copyNumber };