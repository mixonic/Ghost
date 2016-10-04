var _          = require('lodash'),
    path       = require('path'),
    hbs        = require('express-hbs'),
    router     = require('./lib/router'),

    // Dirty requires
    config     = require('../../config'),
    logging    = require('../../logging'),
    i18n       = require('../../i18n'),
    labs       = require('../../utils/labs'),
    template   = require('../../helpers/template'),
    utils      = require('../../helpers/utils'),
    globalUtils = require('../../utils'),

    params = ['error', 'success', 'email'],

    /**
     * This helper script sets the referrer and current location if not existent.
     *
     * document.querySelector['.location']['value'] = document.querySelector('.location')['value'] || window.location.href;
     */
    subscribeScript =
        '<script type="text/javascript">' +
            '(function(g,h,o,s,t){' +
                'h[o](\'.location\')[s]=h[o](\'.location\')[s] || g.location.href;' +
                'h[o](\'.referrer\')[s]=h[o](\'.referrer\')[s] || h.referrer;' +
            '})(window,document,\'querySelector\',\'value\');' +
        '</script>';

function makeHidden(name, extras) {
    return utils.inputTemplate({
        type: 'hidden',
        name: name,
        className: name,
        extras: extras
    });
}

function subscribeFormHelper(options) {
    var root = options.data.root,
        data = _.merge({}, options.hash, _.pick(root, params), {
            action: path.join('/', globalUtils.url.getSubdir(), config.get('routeKeywords').subscribe, '/'),
            script: new hbs.handlebars.SafeString(subscribeScript),
            hidden: new hbs.handlebars.SafeString(
                makeHidden('confirm') +
                makeHidden('location', root.subscribed_url ? 'value=' + root.subscribed_url : '') +
                makeHidden('referrer', root.subscribed_referrer ? 'value=' + root.subscribed_referrer : '')
            )
        });

    return template.execute('subscribe_form', data, options);
}

module.exports = {
    activate: function activate(ghost) {
        var err;

        // Correct way to register a helper from an app
        ghost.helpers.register('subscribe_form', function labsEnabledHelper() {
            if (labs.isSet('subscribers') === true) {
                return subscribeFormHelper.apply(this, arguments);
            }

            err = new Error();
            err.message = i18n.t('warnings.helpers.helperNotAvailable', {helperName: 'subscribe_form'});
            err.context = i18n.t('warnings.helpers.apiMustBeEnabled', {helperName: 'subscribe_form', flagName: 'subscribers'});
            err.help = i18n.t('warnings.helpers.seeLink', {url: 'http://support.ghost.org/subscribers-beta/'});
            logging.error(err);

            return new hbs.handlebars.SafeString('<script>console.error(' + JSON.stringify(err) + ');</script>');
        });
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('/' + config.get('routeKeywords').subscribe + '/', function labsEnabledRouter(req, res, next) {
            if (labs.isSet('subscribers') === true) {
                return router.apply(this, arguments);
            }

            next();
        });
    }
};
