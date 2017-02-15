'use strict'

import fs from 'fs'
import _ from 'lodash'
import mime from 'mime'
import uuid from 'uuid'
import path from 'path'
import config from 'config'
import {TEMPLATES} from '../views/banners'
import {countries} from 'country-data'

_.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;

const native_data_assets =  config.get('native_data_assets')

/**
 * Some filters for parsing data
 */
const filters = {
	hasOrArray: (model, name) => {
		return model[`has_${name}`] && model[name] ? model[name] : []
	},
	allowDeny: (model, name) => {
		let obj = {
			deny_empty: model[`${name}_deny_empty`] || false,
			allow: model[`has_${name}`] && model[`${name}_allow`] ? model[`${name}_allow`] : [],
			deny: model[`has_${name}`] && model[`${name}_deny`] ? model[`${name}_deny`] : []
		}

		if(name === 'targeting_countries'){
			obj = {
				deny_empty: obj.deny_empty,
				allow: filters.tripleCountries(obj.allow),
				deny: filters.tripleCountries(obj.deny),
			}
		}

		return obj
	},
	deny: (model, name) => {
		return {
			deny_empty: model[`${name}_deny_empty`] || false,
			deny: model[`${name}_deny`] ? model[`${name}_deny`] : []
		}
	},
	geoRadius: (model) => {
		if(!model) return []
		// lat
		// lon
		// radius
		return []
	},
	tripleCountries: (arr) => {
		for(let val of arr){
			let c = _.find(countries, { alpha2:val })
			if(c){
				arr.push(c.alpha3)
			}
		}
		return _.uniq(arr)
	}
	// booleanMap: (model, arr_conf) => {
	// 	if(!model || !model.length) return null

	// 	let arr = _.keys(arr_conf).map(x => {
	// 		return model.includes(arr_conf[x]) ? 0 : 1
	// 	})

	// 	return arr
	// },
	// booleanMapReverse: (model, arr_conf) => {
	// 	if(!model || !model.length) return null

	// 	let arr_keys = _.keys(arr_conf)
	// 	let arr = []

	// 	model.forEach((x, i)=>{
	// 		if(x) arr.push(arr_keys[i])
	// 	})

	// 	return arr
	// }

}

/**
 * Map client values of an image creative to DB json field
 *
 * @param {Object} model
 * @returns {Object}
 */
export function mapImageFromClient(model){
	let schema =  {
		id: model.id || uuid.v4(),
		banner: {
			type: 3, // default JavaScript Ad
			width: model.width || 0,
			height: model.height || 0,
			expand: model.expand || 0,
			source: '',
			allowed_positions: {
				positions: model.ad_positions || [],
				any_position: model.has_ad_positions ? false : true
			},
			top_frame_only: model.top_frame_only ? true : false,
			attributes: filters.hasOrArray(model, 'creative_attributes'),
			mimes: [ mime.lookup(model.source) ]
		},
		fullscreen: model.fullscreen ? true : false,
		// full_screen_only: false, // TODO
		client_config: {
			preview: model.preview || '',
			source: model.source || '',
			format: model.format
		}
	}

	// find template
	let template_name = `image_${model.format}`
	if(model.fullscreen){
		template_name += '_fullscreen'
	}

	let tpl = _.find(TEMPLATES, { name: template_name })
	if(tpl){
		schema.banner.type = tpl.type
		schema.banner.api = tpl.api
		schema.banner.mimes = tpl.mimes
		schema.banner.source = _.template(tpl.tpl)({
			source: model.source,
			impression_trackers: [], // TODO
			click_trackers: [] // TODO
		})
	}

	return schema
}


/**
 * Map client values of a native creative to DB json field
 *
 * @param {Object} model
 * @returns {Object}
 */
export function mapNativeFromClient(model){
	let schema =  {
		id: model.id || uuid.v4(),
		native: {
			title: model.title,
			short_title: model.short_title || null,
			data_assets: [],
			image_assets: model.image_assets || [],
			video_assets: []
		}
	}

	if(model.data_assets){
		for(let prop in native_data_assets){
			if(model.data_assets[prop]){
				schema.native.data_assets.push({
					type: parseInt(native_data_assets[prop].type),
					value: model.data_assets[prop].value
				})
			}
		}
	}

	return schema
}

/**
 * Map client values of a camapgin to DB object
 *
 * @param {Object} model
 * @returns {Object}
 */
export function mapCampaignFromClient(model){
	let ID = model.id || uuid.v4()

	let schema = {
		id: ID,
		active: (model.active ? 1 : 0),
		rev: model.rev || 1,
		user_id: model.user_id || null,
		contents:{
			id: model.campaign_id || ID,
			rev: model.rev || 1,
			creatives: [],
			click_url: model.click_url || null,
			name: model.name || null,
			start_time: new Date((model.start_time||0)),
			end_time: model.has_end_time && model.end_time ? new Date(model.end_time) : new Date(9999999999999),
			categories: model.categories || [],
			domain: model.domain || null,
			bundle: model.bundle_name || null,
			targeting: {
				device: {
					require_device: model.targeting_require_device || false,
					blocked_device_types: filters.hasOrArray(model, 'targeting_device_types'),
					blocked_connection_types: filters.hasOrArray(model, 'targeting_connection_types'),
					blocked_oses: filters.hasOrArray(model, 'targeting_os'),
					os_version: filters.allowDeny(model, 'targeting_os_version'),
					make: filters.allowDeny(model, 'targeting_make'),
					carriers: filters.allowDeny(model, 'targeting_carriers'),
					ip_address: filters.deny(model, 'targeting_ip_address'),
					ifa_deny: filters.deny(model, 'targeting_ifa')
				},
				location: {
					geo_filters: filters.geoRadius(model.targeting_locations),
					countries: filters.allowDeny(model, 'targeting_countries'),
					required: model.has_targeting_countries || false, // TODO: & model.has_targeting_location
					require_country: model.has_targeting_countries || false,
					require_location: null // TODO model.has_targeting_location
				},
				categories: {
					categories: filters.hasOrArray(model, 'targeting_categories'),
					levels: filters.hasOrArray(model, 'targeting_category_levels')
				},
				keywords: {
					keywords: model.targeting_keywords ? model.targeting_keywords.split(',').map(x => x.trim()) : null,
					levels: filters.hasOrArray(model, 'targeting_keyword_levels')
				},
				domains: filters.allowDeny(model, 'targeting_domains'),
				bundles: filters.allowDeny(model, 'targeting_bundles'),
				app_traffic_only: model.targeting_traffic === 'app_traffic_only',
				site_traffic_only: model.targeting_traffic === 'site_traffic_only',
				publishers: filters.allowDeny(model, 'targeting_publishers'),
				producers: filters.allowDeny(model, 'targeting_producers'),
				qag_rating: null, //filters.booleanMap(model.targeting_qag_rating, config.get('qag_media_ratings')),
				user: {
					gender: null, // model.has_targeting_user_gender ? filters.booleanMap(model.targeting_user_gender , config.get('genders')) : null,
					age: null, //model.has_targeting_user_age ? filters.booleanMap(model.targeting_user_age , [...new Array(90).keys()]) : null,
					require_id: model.targeting_user_require_id || false,
					max_impressions: model.targeting_user_max_impressions || null
				}
			},
			bidding: {
				currency: model.bidding_currency || null,
				max_price: model.bidding_max_price || null,
				max_cost_per_hour: model.bidding_max_cost_per_hour || null,
				baseline_price_cpm: model.bidding_baseline_price_cpm || null,
				fixed_price: model.bidding_fixed_price || false
			},
			schedule: filters.hasOrArray(model, 'schedule'),
			exchanges: filters.allowDeny(model, 'targeting_exchanges')
		}
	}

	for(let creative of model.creatives){
		if(creative.type === 'image') {
			schema.contents.creatives.push(mapImageFromClient(creative))
		}
		else if(creative.type === 'native') {
			schema.contents.creatives.push(mapNativeFromClient(creative))
		}
	}

	return schema
}


/**
 * Map DB json field values of an image creative to client
 *
 * @param {Object} model
 * @returns {Object}
 */
export function mapImageToClient(model){
	let schema =  {
		id: model.id,
		type: 'image',
		width: _.result(model, 'banner.width', 0),
		height: _.result(model, 'banner.height', 0),
		top_frame_only: _.result(model, 'banner.top_frame_only', false),
		fullscreen: _.result(model, 'fullscreen', false),
		has_ad_positions: !_.result(model, 'banner.any_position', true),
		ad_positions: _.result(model, 'banner.allowed_positions'.positions, []),
		has_creative_attributes: _.result(model, 'banner.attributes', []).length > 0,
		creative_attributes: _.result(model, 'banner.attributes', []),
		source: _.result(model, 'client_config.orig_source', ''),
		preview: _.result(model, 'client_config.preview', ''),
		format: _.result(model, 'client_config.format', '')
	}

	return schema
}


/**
 * Map DB json field values of a native creative to client
 *
 * @param {Object} model
 * @returns {Object}
 */
export function mapNativeToClient(model){
	let schema =  {
		id: model.id,
		type: 'native',
		title:  model.native.title || null,
		short_title:  model.native.short_title || null,
		data_assets: {},
		image_assets: model.native.image_assets || [],
		video_assets: model.native.video_assets || []
	}

	let item = _.result(schema, 'image_assets[0]')
	if(item){
		let minW = _.minBy(schema.image_assets, 'width')
		let maxW = _.maxBy(schema.image_assets, 'width')
		let minH = _.minBy(schema.image_assets, 'height')
		let maxH = _.maxBy(schema.image_assets, 'height')
		schema.preview = item.url
		schema.width = `${minW.width} - ${maxW.width}`
		schema.height = `${minH.height} - ${maxH.height}`
	}

	if(model.native.data_assets){
		for(let val of model.native.data_assets){
			let key = _.findKey(native_data_assets, { type: val.type })
			schema.data_assets[key] = val
		}
	}

	return schema
}


/**
 * Map DB json campaign client values of an image creative to  field
 *
 * @param {Object} model
 * @returns {Object}
 */
export function mapCampaignToClient(model){
	if(!_.isObject(model.contents)){
		model.contents = JSON.parse(model.contents)
	}

	// reset end time
	if(model.contents.end_time && new Date(model.contents.end_time).getTime() === new Date(9999999999999).getTime()){
		model.contents.end_time = null
	}

	let schema = {
		id: model.id,
		campaign_id:_.result(model, 'contents.id', model.id),
		rev: model.rev,
		active: model.active,
		name: _.result(model, 'contents.name', null),
		domain: _.result(model, 'contents.domain', null),
		bidding_currency: _.result(model, 'contents.bidding.currency', null),
		bidding_max_price: _.result(model, 'contents.bidding.max_price', null),
		bidding_max_cost_per_hour: _.result(model, 'contents.bidding.max_cost_per_hour', null),
		bidding_baseline_price_cpm: _.result(model, 'contents.bidding.baseline_price_cpm', null),
		bidding_fixed_price: _.result(model, 'contents.bidding.fixed_price', false),
		categories: _.result(model, 'contents.categories', null),
		start_time: _.result(model, 'contents.start_time', model.created_at || new Date()),
		has_end_time: !!_.result(model, 'contents.end_time', null),
		end_time: _.result(model, 'contents.end_time', null),
		has_schedule: _.result(model, 'contents.schedule', []).length > 0,
		schedule: _.result(model, 'contents.schedule', null),
		bundle_name: _.result(model, 'contents.bundle', null),
		targeting_traffic: 'all',
		click_url: _.result(model, 'contents.click_url', null),

		has_targeting_categories: _.result(model, 'contents.targeting.categories.categories', []).length > 0,
		has_targeting_category_levels: _.result(model, 'contents.targeting.categories.levels', []).length > 0,
		has_targeting_keyword_levels: _.result(model, 'contents.targeting.keywords.levels', []).length > 0,
		has_targeting_device_types: _.result(model, 'contents.targeting.device.blocked_device_types', []).length > 0,
		has_targeting_connection_types: _.result(model, 'contents.targeting.device.blocked_connection_types', []).length > 0,
		has_targeting_os: _.result(model, 'contents.targeting.device.blocked_oses', []).length > 0,

		targeting_keywords: (_.result(model, 'contents.targeting.keywords.keywords') || []).join(','),

		targeting_categories: _.result(model, 'contents.targeting.categories.categories', null),
		targeting_category_levels: _.result(model, 'contents.targeting.categories.levels', null),
		targeting_keyword_levels: _.result(model, 'contents.targeting.keywords.levels', null),
		targeting_device_types: _.result(model, 'contents.targeting.device.blocked_device_types', null),
		targeting_connection_types: _.result(model, 'contents.targeting.device.blocked_connection_types', null),
		targeting_os: _.result(model, 'contents.targeting.device.blocked_oses', null),

		// filter.allowDeny
		targeting_os_version_deny_empty: _.result(model, 'contents.targeting.device.os_version.deny_empty', false),
		targeting_make_deny_empty: _.result(model, 'contents.targeting.device.make.deny_empty', false),
		targeting_carriers_deny_empty: _.result(model, 'contents.targeting.device.carriers.deny_empty', false),
		targeting_countries_deny_empty: _.result(model, 'contents.targeting.location.countries.deny_empty', false),
		targeting_domains_deny_empty: _.result(model, 'contents.targeting.domains.deny_empty', false),
		targeting_bundles_deny_empty: _.result(model, 'contents.targeting.bundles.deny_empty', false),
		targeting_publishers_deny_empty: _.result(model, 'contents.targeting.publishers.deny_empty', false),
		targeting_producers_deny_empty: _.result(model, 'contents.targeting.producers.deny_empty', false),
		targeting_producers_deny_empty: _.result(model, 'contents.targeting.producers.deny_empty', false),
		targeting_exchanges_deny_empty: _.result(model, 'contents.exchanges.deny_empty', false),

		has_targeting_os_version: _.result(model, 'contents.targeting.device.os_version.allow', []).length > 0 || _.result(model, 'contents.targeting.device.os_version.deny', []).length > 0,
		has_targeting_make: _.result(model, 'contents.targeting.device.make.allow', []).length > 0 || _.result(model, 'contents.targeting.device.make.deny', []).length > 0,
		has_targeting_carriers: _.result(model, 'contents.targeting.device.carriers.allow', []).length > 0 || _.result(model, 'contents.targeting.device.carriers.deny', []).length > 0,
		has_targeting_countries: _.result(model, 'contents.targeting.location.countries.allow', []).length > 0 || _.result(model, 'contents.targeting.location.countries.deny', []).length > 0,
		has_targeting_domains: _.result(model, 'contents.targeting.domains.allow', []).length > 0 || _.result(model, 'contents.targeting.domains.deny', []).length > 0,
		has_targeting_bundles: _.result(model, 'contents.targeting.bundles.allow', []).length > 0 || _.result(model, 'contents.targeting.bundles.deny', []).length > 0,
		has_targeting_publishers: _.result(model, 'contents.targeting.publishers.allow', []).length > 0 || _.result(model, 'contents.targeting.publishers.deny', []).length > 0,
		has_targeting_producers: _.result(model, 'contents.targeting.producers.allow', []).length > 0 || _.result(model, 'contents.targeting.producers.deny', []).length > 0,
		has_targeting_producers: _.result(model, 'contents.targeting.producers.allow', []).length > 0 || _.result(model, 'contents.targeting.producers.deny', []).length > 0,
		has_targeting_exchanges: _.result(model, 'contents.exchanges.allow', []).length > 0 || _.result(model, 'contents.exchanges.deny', []).length > 0,

		targeting_os_version_allow: _.result(model, 'contents.targeting.device.os_version.allow', null),
		targeting_make_allow: _.result(model, 'contents.targeting.device.make.allow', null),
		targeting_carriers_allow: _.result(model, 'contents.targeting.device.carriers.allow', null),
		targeting_countries_allow: _.result(model, 'contents.targeting.location.countries.allow', null),
		targeting_domains_allow: _.result(model, 'contents.targeting.domains.allow', null),
		targeting_bundles_allow: _.result(model, 'contents.targeting.bundles.allow', null),
		targeting_publishers_allow: _.result(model, 'contents.targeting.publishers.allow', null),
		targeting_producers_allow: _.result(model, 'contents.targeting.producers.allow', null),
		targeting_producers_allow: _.result(model, 'contents.targeting.producers.allow', null),
		targeting_exchanges_allow: _.result(model, 'contents.exchanges.allow', null),

		targeting_os_version_deny: _.result(model, 'contents.targeting.device.os_version.deny', null),
		targeting_make_deny: _.result(model, 'contents.targeting.device.make.deny', null),
		targeting_carriers_deny: _.result(model, 'contents.targeting.device.carriers.deny', null),
		targeting_countries_deny: _.result(model, 'contents.targeting.location.countries.deny', null),
		targeting_domains_deny: _.result(model, 'contents.targeting.domains.deny', null),
		targeting_bundles_deny: _.result(model, 'contents.targeting.bundles.deny', null),
		targeting_publishers_deny: _.result(model, 'contents.targeting.publishers.deny', null),
		targeting_producers_deny: _.result(model, 'contents.targeting.producers.deny', null),
		targeting_producers_deny: _.result(model, 'contents.targeting.producers.deny', null),
		targeting_exchanges_deny: _.result(model, 'contents.exchanges.deny', null),

		// filter.deny
		targeting_ip_address_deny_empty: _.result(model, 'contents.targeting.device.ip_address.deny_empty', null),
		targeting_ip_address_deny: _.result(model, 'contents.targeting.device.ip_address.deny', null),
		targeting_ifa_deny_empty: _.result(model, 'contents.targeting.device.ifa_deny.deny_empty', null),
		targeting_ifa_deny: _.result(model, 'contents.targeting.device.ifa_deny.deny', null),

		// user
		targeting_user_require_id:  _.result(model, 'contents.targeting.user.require_id', null),
		has_targeting_user_gender: null, // TODO
		targeting_user_gender: null, //filters.booleanMapReverse(model.contents.targeting.user.gender, config.get('genders')), // TODO
		has_targeting_user_age: null, // TODO
		targeting_user_age: null, // TODO
		targeting_user_max_impressions: _.result(model, 'contents.targeting.user.max_impressions', null),
		targeting_qag_rating: null, //filters.booleanMapReverse(model.contents.targeting.qag_rating, config.get('qag_media_ratings')),

		creatives: [],
		created_at: model.created_at,
		updated_at: model.updated_at
	}

	if(_.result(model, 'contents.targeting.app_traffic_only'))
		schema.targeting_traffic = 'app_traffic_only'
	else if(_.result(model, 'contents.targeting.site_traffic_only'))
		schema.targeting_traffic = 'site_traffic_only'

	for(let creative of _.result(model, 'contents.creatives', [])){
		if(creative.hasOwnProperty('banner')){
			schema.creatives.push(mapImageToClient(creative))
		}else if(creative.hasOwnProperty('native')){
			schema.creatives.push(mapNativeToClient(creative))
		}
	}

	return schema
}