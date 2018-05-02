'use strict';

/**
 * Banktransfer.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');
const IPkoService = require('../../../ipko/IPko');

const hourInSeconds = 60 * 60 * 1000;

let isLoadingTransfers = false,
  lastTimeLoadingTransfers = new Date().getTime();// - hourInSeconds - 100;

function matchString(banktransfer, string) {
  return banktransfer.senderData.toLowerCase().indexOf(string) !== -1 || banktransfer.title.toLowerCase().indexOf(string) !== -1;
}

function matchStudent(banktransfer, { firstName, lastName }) {
  let senderDataResult = 0,
    titleResult = 0;

  if (banktransfer.senderData.toLowerCase().indexOf(firstName) !== -1) {
    senderDataResult++;
  }

  if (banktransfer.senderData.toLowerCase().indexOf(lastName) !== -1) {
    senderDataResult = senderDataResult * 10 + 2;
  }

  if (banktransfer.title.toLowerCase().indexOf(firstName) !== -1) {
    titleResult += 2;
  }

  if (banktransfer.title.toLowerCase().indexOf(lastName) !== -1) {
    titleResult = titleResult * 10 + 2;
  }

  return senderDataResult + titleResult;
}

async function fillStudentDataMaps(firstNames, lastNames, showDeleted = false) {
  const allStudents = await Student.find().populate('groups');

  allStudents.forEach((student) => {
    const currentGroups = student.groups.filter(group => group.deleted !== true);

    if(!currentGroups.length && !showDeleted) {
      return;
    }

    if (!showDeleted) {
      student.groups = currentGroups;
    }

    const id = student._id,
      firstName = student.firstName.toLowerCase(),
      lastName = student.lastName.toLowerCase(),
      simpleStudent = {
        firstName,
        lastName,
        id,
        student
      };

    if (!firstNames[firstName]) {
      firstNames[firstName] = [];
    }

    firstNames[firstName].push(simpleStudent);

    if (!lastNames[lastName]) {
      lastNames[lastName] = [];
    }

    lastNames[lastName].push(simpleStudent);
  });
}

function findMatches(bankTransfer, items, matchedStudents, matchingStudentsScores) {
  Object.keys(items).forEach((item) => {
    if (matchString(bankTransfer, item)) {
      const students = items[item];

      students.forEach((student) => {
        if (!matchedStudents[student.id]) {
          matchedStudents[student.id] = true;
          const score = matchStudent(bankTransfer, student);
          matchingStudentsScores.push({
            student,
            score
          });
        }
      });
    }
  });
}

module.exports = {

  /**
   * Promise to fetch all banktransfers.
   *
   * @return {Promise}
   */

  fetchAll: (params) => {
    const convertedParams = strapi.utils.models.convertParams('banktransfer', params);

    return Banktransfer
    .find()
    .where(convertedParams.where)
    .sort(convertedParams.sort)
    .skip(convertedParams.start)
    .limit(convertedParams.limit)
    .populate(_.keys(_.groupBy(_.reject(strapi.models.banktransfer.associations, { autoPopulate: false }), 'alias')).join(' '));
  },

  /**
   * Promise to fetch a/an banktransfer.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    return Banktransfer
    .findOne(_.pick(params, _.keys(Banktransfer.schema.paths)))
    .populate(_.keys(_.groupBy(_.reject(strapi.models.banktransfer.associations, { autoPopulate: false }), 'alias')).join(' '));
  },

  /**
   * Promise to add a/an banktransfer.
   *
   * @return {Promise}
   */

  add: async (values) => {
    const data = await Banktransfer.create(_.omit(values, _.keys(_.groupBy(strapi.models.banktransfer.associations, 'alias'))));
    await strapi.hook.mongoose.manageRelations('banktransfer', _.merge(_.clone(data), { values }));
    return data;
  },

  /**
   * Promise to edit a/an banktransfer.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    // Note: The current method will return the full response of Mongo.
    // To get the updated object, you have to execute the `findOne()` method
    // or use the `findOneOrUpdate()` method with `{ new:true }` option.
    await strapi.hook.mongoose.manageRelations('banktransfer', _.merge(_.clone(params), { values }));
    return Banktransfer.update(params, values, { multi: true });
  },

  /**
   * Promise to remove a/an banktransfer.
   *
   * @return {Promise}
   */

  remove: async params => {
    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await Banktransfer.findOneAndRemove(params, {})
    .populate(_.keys(_.groupBy(_.reject(strapi.models.banktransfer.associations, { autoPopulate: false }), 'alias')).join(' '));

    _.forEach(Banktransfer.associations, async association => {
      const search = (_.endsWith(association.nature, 'One')) ? { [association.via]: data._id } : { [association.via]: { $in: [data._id] } };
      const update = (_.endsWith(association.nature, 'One')) ? { [association.via]: null } : { $pull: { [association.via]: data._id } };

      await strapi.models[association.model || association.collection].update(
        search,
        update,
        { multi: true });
    });

    return data;
  },

  /**
   * Promise to remove a/an banktransfer.
   *
   * @return {Promise}
   */

  ignore: async params => {
    return await Banktransfer.update(params, {ignored: true});
  },

  loadTransfers: async (company = 'AT') => {
    const timestamp = new Date().getTime(),
      diff = timestamp - lastTimeLoadingTransfers;
    if (isLoadingTransfers || diff < hourInSeconds) {
      return;
    }
    isLoadingTransfers = true;
    lastTimeLoadingTransfers = timestamp;

    const {login, password, accounts} = strapi.config.currentEnvironment.ipko;
    const ipko = new IPkoService(login, password),
      lastBankTransfer = await strapi.services.banktransfer.fetchAll({
        company,
        _sort: '-operationDate',
        _limit: 1
      }),
      dateFrom = lastBankTransfer.length ? lastBankTransfer[0].operationDate.toJSON().substr(0, 10) : '2018-04-15',
      dateTo = new Date().toJSON().substr(0, 10),
      bankTransfers = await ipko.loadTransfers(accounts[company], dateFrom, dateTo);

    for (let i = 0; i < bankTransfers.length; i++) {
      const bankTransfer = bankTransfers[i],
        hashExists = await strapi.services.banktransfer.fetch({ hash: bankTransfer.hash });

      if (!hashExists) {
        await strapi.services.banktransfer.add({
          postDate: bankTransfer.postDate,
          operationDate: bankTransfer.operationDate,
          amount: bankTransfer.amount,
          title: bankTransfer.title,
          senderData: bankTransfer.senderData,
          senderAccountNumber: bankTransfer.senderAccountNumber,
          transactionType: bankTransfer.transactionType,
          hash: bankTransfer.hash,
          company
        });
      }
    }
    isLoadingTransfers = false;
  },

  transfersToAssign: async (company = 'AT') => {
    const firstNames = {},
      lastNames = {};

    // fills firstNames and lastNames map with student object with certain firstNames/lastNames
    await fillStudentDataMaps(firstNames, lastNames);

    const bankTransfersToAssign = await Banktransfer.find().where({ assigned: { $ne: true }, ignored: { $ne: true }, company }),
      bankTransfersWithMatchingStudents = [];

    for (let i = 0; i < bankTransfersToAssign.length; i++) {
      const bankTransfer = bankTransfersToAssign[i],
        matchingStudentsScores = [],
        matchedStudents = {};

      // find matching students by firstName
      findMatches(bankTransfer, firstNames, matchedStudents, matchingStudentsScores);
      // and by lastName
      findMatches(bankTransfer, lastNames, matchedStudents, matchingStudentsScores);

      // we need only 5 best results
      const matchingStudentsResult = matchingStudentsScores.sort((a, b) => {
        return b.score - a.score;
      }).slice(0, 5).map(item => item.student.student);

      bankTransfersWithMatchingStudents.push({
        bankTransfer,
        matchingStudentsResult
      });
    }

    return bankTransfersWithMatchingStudents;
  }
};
