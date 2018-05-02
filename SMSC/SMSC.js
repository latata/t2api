const fetch = require('node-fetch');

const API_URL = 'https://api2.serwersms.pl/';

class SMSC {
  constructor(username, password, test = false) {
    this.username = username;
    this.password = password;
    this.test = test;
  }

  async sendMessage(phone, text) {
    const url = `${API_URL}messages/send_sms`;
    return await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        test: this.test,
        phone,
        text,
        details: true,
      })
    }).then((response) => {
      return response.json();
    });
  }

  async reports(id) {
    const url = `${API_URL}messages/reports`;
    return await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        id
      })
    }).then((response) => {
      return response.json();
    });
  }
}

module.exports = SMSC;
