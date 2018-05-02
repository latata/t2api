'use strict';

/**
 * Group.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');

module.exports = {

  test: () => {
    console.log('TEST!!!');
  },

  /**
   * Promise to fetch all groups.
   *
   * @return {Promise}
   */

  fetchAll: (params, showDeleted = false) => {
    const convertedParams = strapi.utils.models.convertParams('group', params);

    if (!showDeleted) {
      convertedParams.where.deleted = { $ne: true };
    }

    return Group
      .find()
      .where(convertedParams.where)
      .sort(convertedParams.sort)
      .skip(convertedParams.start)
      .limit(convertedParams.limit)
      .populate(_.keys(_.groupBy(_.reject(strapi.models.group.associations, {autoPopulate: false}), 'alias')).join(' '));
  },

  /**
   * Promise to fetch a/an group.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    return Group
      .findOne(_.pick(params, _.keys(Group.schema.paths)))
      .populate(_.keys(_.groupBy(_.reject(strapi.models.group.associations, {autoPopulate: false}), 'alias')).join(' '), null, {deleted: { $ne: true } });
  },

  /**
   * Promise to add a/an group.
   *
   * @return {Promise}
   */

  add: async (values) => {
    const data = await Group.create(_.omit(values, _.keys(_.groupBy(strapi.models.group.associations, 'alias'))));
    await strapi.hook.mongoose.manageRelations('group', _.merge(_.clone(data), { values }));
    return data;
  },

  /**
   * Promise to edit a/an group.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    // Note: The current method will return the full response of Mongo.
    // To get the updated object, you have to execute the `findOne()` method
    // or use the `findOneOrUpdate()` method with `{ new:true }` option.
    await strapi.hook.mongoose.manageRelations('group', _.merge(_.clone(params), { values }));
    return Group.update(params, values, { multi: true });
  },

  /**
   * Promise to remove a/an group.
   *
   * @return {Promise}
   */

  remove: async params => {
    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await Group.findOneAndRemove(params, {})
      .populate(_.keys(_.groupBy(_.reject(strapi.models.group.associations, {autoPopulate: false}), 'alias')).join(' '));

    _.forEach(Group.associations, async association => {
      const search = (_.endsWith(association.nature, 'One')) ? { [association.via]: data._id } : { [association.via]: { $in: [data._id] } };
      const update = (_.endsWith(association.nature, 'One')) ? { [association.via]: null } : { $pull: { [association.via]: data._id } };

      await strapi.models[association.model || association.collection].update(
        search,
        update,
        { multi: true });
    });

    return data;
  },

  setDeleted: async params => {
    return await Group.update(params, { deleted: true });
  }
};
