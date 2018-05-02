const fetch = require('node-fetch');
const csv = require('node-csv').createParser();
const FormData = require('form-data');
var iconv = require('iconv-lite');
const sha256 = require('js-sha256');

async function loginPhase1(login) {
  const headers = {
      'Content-Type': 'application/json'
    },
    data = {
      '_method': 'POST',
      'version': 2,
      'seq': 1,
      'location': '',
      'request': {
        'state': 'login',
        'data': {
          'login': login
        }
      }
    };
  return await fetch('https://www.ipko.pl/secure/ikd3/api/login', {
    method: 'post',
    headers,
    body: JSON.stringify(data)
  }).then(response => response.json());
}

async function loginPhase2(sessionId, flowId, password) {
  const headers = {
      'x-ias-ias_sid': sessionId,
      'Content-Type': 'application/json',
      'X-HTTP-Method': 'PUT',
      'X-HTTP-Method-Override': 'PUT',
      'X-METHOD-OVERRIDE': 'PUT',
      'X-Requested-With': 'XMLHttpRequest'
    },
    data = {
      '_method': 'PUT',
      'sid': sessionId,
      'version': 2,
      'seq': 2,
      'location': '',
      'request': {
        'state': 'password',
        'flow_id': flowId,
        'first_prelogin': true,
        'data': {
          'password': password
        }
      }
    };
  return await fetch('https://www.ipko.pl/secure/ikd3/api/login', {
    method: 'post',
    headers,
    body: JSON.stringify(data)
  }).then(response => response.json());
}

async function loginPhase3(sessionId, flowId) {
  const headers = {
      'x-ias-ias_sid': sessionId,
      'Content-Type': 'application/json',
      'X-HTTP-Method': 'PUT',
      'X-HTTP-Method-Override': 'PUT',
      'X-METHOD-OVERRIDE': 'PUT',
      'X-Requested-With': 'XMLHttpRequest'
    },
    data = {
      '_method': 'PUT',
      'sid': sessionId,
      'version': 2,
      'seq': 3,
      'location': '',
      'request': {
        'state': 'dispatch',
        'flow_id': flowId,
        'first_prelogin': true,
        'data': {}
      }
    };
  return await fetch('https://www.ipko.pl/secure/ikd3/api/login', {
    method: 'post',
    headers,
    body: JSON.stringify(data)
  }).then(response => response.json());
}

async function prepareDownloadTicket(sessionId, account, dateFrom, dateTo) {
  const headers = {
      'x-ias-ias_sid': sessionId,
      'Content-Type': 'application/json',
      'X-HTTP-Method': 'PUT',
      'X-HTTP-Method-Override': 'PUT',
      'X-METHOD-OVERRIDE': 'PUT',
      'X-Requested-With': 'XMLHttpRequest'
    },
    data = {
      '_method': 'POST',
      'sid': sessionId,
      'seq': 4,
      'location': '',
      'request': {
        format: 'csv',
        account: account,
        'date_from': dateFrom,
        'date_to': dateTo,
        operation_type: 'CREDIT',
        amount_smaller: '',
        amount_greater: '',
        other_side_owner: '',
        other_side_account: '',
        title: '',
      }
    };
  return await fetch('https://www.ipko.pl/secure/ikd3/api/accounts/operations/completed/download', {
    method: 'post',
    headers,
    body: JSON.stringify(data)
  }).then(response => response.json());
}

async function download(sessionId, ticketId) {
  const form = new FormData();
  form.append('ias_sid', sessionId);
  form.append('ticketId', ticketId);
  return await fetch('https://www.ipko.pl/print/' + ticketId, {
    method: 'post',
    body: form
  })
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => iconv.decode(new Buffer(arrayBuffer), 'win1250').toString())
}

async function login(login, password) {
  const phase1Result = await loginPhase1(login),
    sessionId = phase1Result['session']['sid'],
    flowId = phase1Result['response']['flow_id'];

  await loginPhase2(sessionId, flowId, password);
  await loginPhase3(sessionId, flowId);

  return sessionId;
}

function parseCSV(data) {
  return new Promise((resolve, reject) => {
    csv.parse(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

class IPkoService {
  constructor(login, password) {
    this.login = login;
    this.password = password;
  }

  async loadTransfers(accountNo, dateFrom, dateTo) {
    if (!this.sessionId) {
      this.sessionId = await login(this.login, this.password);
      this.login = null;
      this.password = null;
    }
    const downloadTicket = await prepareDownloadTicket(this.sessionId, accountNo, dateFrom, dateTo),
      data = await download(this.sessionId, downloadTicket['response']['ticket_id']);

    return await BankTransfer.parseCSV(data);
  }
}

class BankTransfer {
  constructor(data, hashes, company) {
    this.company = company;
    this.operationDate = data[0];
    this.postDate = data[1];
    this.transactionType = data[2];
    this.amount = parseFloat(data[3].replace(/[ +]/g, '').replace(',', '.'));
    for (let i = 6; i < data.length; i++) {
      if (!data[i]) {
        break;
      }
      const item = data[i].split(':'),
        itemName = item[0].trim(),
        itemValue = item.slice(1).join(':').trim();
      switch (itemName) {
        case 'Rachunek nadawcy':
          this.senderAccountNumber = itemValue;
          break;
        case 'Nazwa nadawcy':
          this.senderData = itemValue;
          break;
        case 'Tytuł':
          this.title = itemValue;
          break;
      }
    }
    const stringToHash = Object.keys(this).sort().map(key => this[key]).join('.');
    let hash = sha256(stringToHash);

    if (hashes[hash]) {
      hashes[hash] += 1;
      this.duplicatedTransferId = hashes[hash];
      hash = sha256(`${stringToHash}.${hashes[hash]}`);
    }

    this.hash = hash;
  }
}

BankTransfer.parseCSV = async function (data) {
  const hashes = {};
  return (await parseCSV(data)).slice(1).map(itemData => {
    const bankTransfer = new BankTransfer(itemData, hashes);
    hashes[bankTransfer.hash] = 1;

    return bankTransfer;
  });
};

module.exports = IPkoService;
