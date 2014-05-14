define(function(require, exports, module) {
  var $ = require('jquery');
  var _ = require('underscore');
  var Backbone = require('backbone');
  var moment = require('moment');
  var cookie = require('cookie');
  var timezones = require('../timezones');

  require('pickadate');

  function createDateArray(date) {
    return date.split('-').map(function(value) {
      return +value;
    });
  }

  module.exports = Backbone.View.extend({
    el: $('.picker'),

    initialize: function(options) {
      if (!this.collection || !this.model) {
        throw new Error('You must pass a model and a collection');
      }

      if (!options.user) {
        throw new Error('You must pass a user model');
      }
      this.user = options.user;

      this.listenTo(this.collection, 'reset', this.render);

      this.collection.dfd.done(this.render.bind(this));
    },

    events: {
      'change select,input': 'updateConfig',
      'click [data-action="add-calendar"]': 'addCalendar',
      'click [data-action="remove-calendar"]': 'removeCalendar',
      'click [data-week]': 'setCalendarRange'
    },

    updateConfig: function(e) {
      var $elem = $(e.currentTarget);
      var name = $elem.attr('name');
      var attrs = {};
      attrs[name] = $elem.val();

      if ($elem.hasClass('add-calendar')) {
        attrs.options = {
          remove: false
        };
      }

      if ($elem.is('select:not(.add-calendar)') && $elem.val()) {
        cookie.set(name, $elem.val());
      }

      if ($elem.is(':checkbox')) {
        attrs[name] = $elem.prop('checked');
      }
      this.model.set(attrs);
    },

    addCalendar: function(e) {
      e.preventDefault();
      var $select = this.$('.calendar-select').first().clone();
      $select.find('select').addClass('add-calendar');
      $select.find('option').first().attr('selected', true);
      $(e.currentTarget).before($select);
    },

    removeCalendar: function(e) {
      e.preventDefault();
      $(e.currentTarget).parent().remove();
      if (this.$('.calendar-select').length === 1) {
        this.$('.calendar-select select').trigger('change');
      }
    },

    updateAllConfigs: function(e) {
      var model = this.model;
      var attrs = {};

      this.$('input, select').each(function() {
        var $this = $(this);
        var value = $this.is(':checkbox') ? $this.prop('checked') : this.value;
        attrs[$this.attr('name')] = value;
      });

      model.set(attrs);
    },

    setCalendarRange: function(e) {
      e.preventDefault();

      var $this = $(e.currentTarget);
      $this.removeClass('topcoat-button--quiet');
      $this.siblings('a').addClass('topcoat-button--quiet');

      switch($this.data('week')) {
        case 'current':
          this.$('.custom-range').slideUp();
          this.setDatePicker(moment(), moment().endOf('week'));
          break;
        case 'next':
          var nextWeek = moment().add('w', 1);
          this.setDatePicker(nextWeek.clone().startOf('week'), nextWeek.clone().endOf('week'));
          this.$('.custom-range').slideUp();
          break;
        case 'custom':
          this.$('.custom-range').slideDown();
          break;
        default:
          break;
      }
    },

    timezones: function(cb) {
      return _.each(timezones, cb, this);
    },

    template: require('tpl!templates/settings.ejs'),

    render: function() {
      this.$el.html(this.template(this));
      this.setCalendarFromCookie();
      this.renderDatePicker();
      this.setStartAndEnd();
      this.setTimezone();
      this.updateAllConfigs();
    },

    setStartAndEnd: function() {
      _.each(['start', 'end'], function(value) {
        var c = cookie.get(value);
        if (c) {
          this.$('select[name="' + value + '"]').val(c);
        }
      }, this);
    },

    setTimezone: function() {
      var timezone = moment().zone();
      var isDST = moment().isDST();
      var sign = moment().format('ZZ').substr(0, 1);

      if (isDST) {
        timezone += 60;
      }

      var zoneKey = [sign + timezone, isDST ? 1 : 0].join(',');
      var zoneValue = _.filter(timezones, function(value) {
        if (value.search(zoneKey) > -1) {
          return true;
        }
      });

      if (zoneValue.length) {
        this.$('select[name="timezone"]').val(zoneValue[0]);
      }
    },

    setCalendarFromCookie: function() {
      var calendar = cookie.get('calendar');
      if (calendar) {
        this.$('select[name="calendar"]').val(calendar);
      } else {
        this.$('select[name="calendar"] option[value="' + this.user.get('email') + '"]').prop('selected', true);
      }
    },

    renderDatePicker: function() {
      var start = this.startDate = this.$('input[name="timeMin"]').pickadate({
        onSelect: function() {
          var fromDate = createDateArray(this.getDate('yyyy-mm-dd'));
          end.data('pickadate').setDateLimit(fromDate);
        }
      });

      var end = this.endDate = this.$('input[name="timeMax"]').pickadate({
        onSelect: function() {
          var toDate = createDateArray(this.getDate('yyyy-mm-dd'));
          start.data('pickadate').setDateLimit(toDate, 1);
        }
      });

      this.setDatePicker(moment(), moment().endOf('week'));
    },

    setDatePicker: function(start, end) {
      this.model.unset('timeMin', { silent: true });
      this.model.unset('timeMax', { silent: true });

      this.startDate.data('pickadate')
        .setDate(start.year(), start.month() + 1, start.date());

      this.endDate.data('pickadate')
        .setDate(end.year(), end.month() + 1, end.date());
    }

  });
});
