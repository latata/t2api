'use strict';

/**
 * Grouppricing.js controller
 *
 * @description: A set of functions called "actions" for managing `Grouppricing`.
 */

module.exports = {

  /**
   * Retrieve grouppricing records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    const data = await strapi.services.grouppricing.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve a grouppricing record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    const data = await strapi.services.grouppricing.fetch(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an grouppricing record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const data = await strapi.services.grouppricing.add(ctx.request.body);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an grouppricing record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    const data = await strapi.services.grouppricing.edit(ctx.params, ctx.request.body) ;

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an grouppricing record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    const data = await strapi.services.grouppricing.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  }
};
