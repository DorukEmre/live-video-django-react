import {
  copyIcon, checkIcon
} from './images';


const copyUserPhone = (e) => {
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

const copyPhone = (e) => {
  let phone = e.target.innerText.slice(0, -1); // slicing last character (space)
  const input = document.getElementById('receiverPhone');
  if (input) {
    input.value = phone;
    input.focus();
  }
}

export { copyUserPhone, copyPhone };