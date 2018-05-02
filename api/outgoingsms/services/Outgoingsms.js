'use strict';

/**
 * Outgoingsms.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');
const SMSC = require('../../../SMSC/SMSC');

module.exports = {

  /**
   * Promise to fetch all outgoingsms.
   *
   * @return {Promise}
   */

  fetchAll: (params) => {
    const convertedParams = strapi.utils.models.convertParams('outgoingsms', params);

    return Outgoingsms
      .find()
      .where(convertedParams.where)
      .sort(convertedParams.sort)
      .skip(convertedParams.start)
      .limit(convertedParams.limit)
      .populate(_.keys(_.groupBy(_.reject(strapi.models.outgoingsms.associations, {autoPopulate: false}), 'alias')).join(' '));
  },

  /**
   * Promise to fetch a/an outgoingsms.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    return Outgoingsms
      .findOne(_.pick(params, _.keys(Outgoingsms.schema.paths)))
      .populate(_.keys(_.groupBy(_.reject(strapi.models.outgoingsms.associations, {autoPopulate: false}), 'alias')).join(' '));
  },

  /**
   * Promise to add a/an outgoingsms.
   *
   * @return {Promise}
   */

  add: async (values) => {
    const data = await Outgoingsms.create(_.omit(values, _.keys(_.groupBy(strapi.models.outgoingsms.associations, 'alias'))));
    await strapi.hook.mongoose.manageRelations('outgoingsms', _.merge(_.clone(data), { values }));
    return data;
  },

  /**
   * Promise to edit a/an outgoingsms.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    // Note: The current method will return the full response of Mongo.
    // To get the updated object, you have to execute the `findOne()` method
    // or use the `findOneOrUpdate()` method with `{ new:true }` option.
    await strapi.hook.mongoose.manageRelations('outgoingsms', _.merge(_.clone(params), { values }));
    return Outgoingsms.update(params, values, { multi: true });
  },

  /**
   * Promise to remove a/an outgoingsms.
   *
   * @return {Promise}
   */

  remove: async params => {
    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await Outgoingsms.findOneAndRemove(params, {})
      .populate(_.keys(_.groupBy(_.reject(strapi.models.outgoingsms.associations, {autoPopulate: false}), 'alias')).join(' '));

    _.forEach(Outgoingsms.associations, async association => {
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
   * Send messages
   *
   * @return {Promise}
   */

  send: async (values) => {
    const students = await Student.find({
      _id: { $in: values.studentIds }
    });

    const messages = [];
    const phoneNumbers = [];
    const messagesMap = {};
    students.forEach((student) => {
      const phoneNo = `+48${student.phoneNo}`;
      const message = {
        phoneNo,
        text: values.text,
        outgoingSmsStudent: student._id,
      };
      messages.push(message);
      phoneNumbers.push(phoneNo);
      if(!messagesMap[phoneNo]) {
        messagesMap[phoneNo] = message;
      } else {
        throw 'Na liście odbiorców znajduje się więcej niż raz ten sam numer telefonu. Popraw i spróbuj ponownie.';
      }
    });

    const { login, password } = strapi.config.currentEnvironment['sms-c'];
    const smsc = new SMSC(login, password, true);
    const result = await smsc.sendMessage(phoneNumbers, values.text);

    result.items.forEach((item) => {
      const message = messagesMap[item.phone];

      if(message) {
        message.smsId = item.id;
        message.smsData = item;
      }
    });

    await Outgoingsms.create(messages);

    return messages;
  },
};
