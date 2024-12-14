import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCookie } from '../js/utils';

async function setCSRFCookie() {
  const baseURL = process.env.REACT_APP_API_BASE_URL || '';

  let url = `${baseURL}/api/set-csrf-cookie/`;
  try {
    return await axios.get(url, { withCredentials: true });
  } catch (error) {
    console.error('Error fetching: ', error);
  }
}

const CSRFToken = () => {
  const [csrftoken, setCsrftoken] = useState(null);

  useEffect(() => {
    const fetchCSRFToken = async () => {
      let token = getCookie('csrftoken');
      if (token === null) {
        await setCSRFCookie();
        token = getCookie('csrftoken');
      }
      setCsrftoken(token);
    };

    fetchCSRFToken();
  }, []);

  return (
    <input type="hidden" name="csrfmiddlewaretoken" value={csrftoken || ''} />
  );
};

export default CSRFToken;