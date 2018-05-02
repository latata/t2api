'use strict';

/**
 * Student.js controller
 *
 * @description: A set of functions called "actions" for managing `Student`.
 */

module.exports = {

  /**
   * Retrieve student records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    let data;

    if (ctx.query.query) {
      data = await strapi.services.student.search(ctx.query.query);
    } else if(ctx.query.groups) {
      data = await strapi.services.student.fetchAll(ctx.query);
      data.forEach((student) => {
        student.studentPayments = student.studentPayments.filter(payment => {
          return payment.paymentGroup.toString() === ctx.query.groups;
        });
      });
      data = data.filter(student => !student.groupsOptions || !student.groupsOptions[ctx.query.groups] || !student.groupsOptions[ctx.query.groups].resigned);
    } else {
      data = await strapi.services.student.fetchAll(ctx.query);
    }

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve a student record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    const data = await strapi.services.student.fetch(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an student record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const data = await strapi.services.student.add(ctx.request.body);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an student record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    const data = await strapi.services.student.edit(ctx.params, ctx.request.body) ;

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an student record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    const data = await strapi.services.student.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Set deleted flag to a/an student record.
   *
   * @return {Object}
   */

  setDeleted: async (ctx, next) => {
    const data = await strapi.services.student.setDeleted(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  }
};
