'use strict';

/**
 * Group.js controller
 *
 * @description: A set of functions called "actions" for managing `Group`.
 */

module.exports = {

  /**
   * Retrieve group records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    const showDeleted = !!ctx.query.showDeleted;
    
    delete ctx.query.showDeleted;

    const data = await strapi.services.group.fetchAll(ctx.query, showDeleted);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve a group record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    const data = await strapi.services.group.fetch(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an group record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const data = await strapi.services.group.add(ctx.request.body);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an group record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    const data = await strapi.services.group.edit(ctx.params, ctx.request.body) ;

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an group record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    const data = await strapi.services.group.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Set deleted flag to a/an group record.
   *
   * @return {Object}
   */

  setDeleted: async (ctx, next) => {
    const data = await strapi.services.group.setDeleted(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  }
};
