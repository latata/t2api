'use strict';

/**
 * Banktransfer.js controller
 *
 * @description: A set of functions called "actions" for managing `Banktransfer`.
 */

module.exports = {

  /**
   * Retrieve banktransfer records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    // await strapi.services.banktransfer.loadTransfers();
    const data = await strapi.services.banktransfer.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve a banktransfer record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    const data = await strapi.services.banktransfer.fetch(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an banktransfer record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const data = await strapi.services.banktransfer.add(ctx.request.body);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an banktransfer record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    const data = await strapi.services.banktransfer.edit(ctx.params, ctx.request.body) ;

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an banktransfer record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    const data = await strapi.services.banktransfer.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an banktransfer record.
   *
   * @return {Object}
   */

  ignore: async (ctx, next) => {
    const data = await strapi.services.banktransfer.ignore(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an banktransfer record.
   *
   * @return {Object}
   */

  connect: async (ctx, next) => {
    await strapi.services.banktransfer.loadTransfers(ctx.params.company);
    const data = await strapi.services.banktransfer.transfersToAssign(ctx.params.company);

    // Send 200 `ok`
    ctx.send(data);
  }
};
