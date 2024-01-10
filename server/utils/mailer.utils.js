const {POST_DELIVERY_PREFIX} = require('../shared/config/constants');
const nodemailerPostDelivery = require('../helpers/mailerPostDelivery.helpers');

function getPostDeliveryMethodNames() {
  return Object.keys(nodemailerPostDelivery)
    .filter((key) => key.indexOf(POST_DELIVERY_PREFIX) > -1);
}

exports.getPostDeliveryMethodNames = getPostDeliveryMethodNames;