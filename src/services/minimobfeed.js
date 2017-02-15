"use strict"
const MAX_BIDDING_PRICE = parseFloat(process.env.MAX_BIDDING_PRICE) || 0.20
const BASELINE_PRICE = parseFloat(process.env.BASELINE_PRICE) || 0.10
const MAX_COST_PER_HOUR = parseFloat(process.env.MAX_COST_PER_HOUR) || 2.0
const ICON_SIZES = [96, 128, 256]
const countries = require("country-data").countries;

const fs = require("fs");
const _ = require("lodash");
_.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;
const rtb = require("../../rtb");
const getRawBody = require("raw-body");
const http = require("http");
const https = require("https");
const url = require("url");
const co = require("co");
const banners = require("../views/banners");

const MINIMOB_FEED_URL = "http://dashboard.minimob.com/api/myoffers"

function* get(s) {
	const u = url.parse(s);
	const res = yield(done) => {
		(u.protocol == 'https' ? https : http).get(s, res => {
			done(null, res)
		}).on('error', done)
	}

	const body = yield getRawBody(res);
	const str = body.toString();
	return JSON.parse(str);
}

function offerMainImageAssets(offer) {
	return offer.creatives
		.filter(cr => cr.mimeType == "image/jpeg")
		.map(cr => {
			let dims = (cr.dimensions || "0x0").split("x");
			let w = parseInt(dims[0]);
			let h = parseInt(dims[1]);
			return {
				type: rtb.NATIVE_IMAGE_ASSET_MAIN,
				url: cr.previewUrl,
				width: w,
				height: h,
				mime: cr.mimeType,
			}
		});
}

function offerIconAssets(offer) {
	return ICON_SIZES.map(size => ({
		type: rtb.NATIVE_IMAGE_ASSET_ICON,
		width: size,
		height: size,
		url: offer.appIconLink.replace(/w\d+$/, `w${size}`),
		mime: "image/png",
	}));
}

function offerVideoAssets(offer) {
	return offer.creatives
		.filter(cr => cr.mimeType == "video/mp4")
		.map(cr => ({
			url: cr.previewUrl,
			click_trackers: [],
		}));
}

function offerDataAssets(offer) {
	const assets = []
	const desc = (offer.appDescription || "").split("\n")[0]
	if (desc != null && desc != "") {
		assets.push({
			type: rtb.NATIVE_DATA_ASSET_DESCRIPTION,
			value: desc,
		})
	}
	return assets;
}

function offerImageAssets(offer) {
	return [].concat(offerIconAssets(offer), offerMainImageAssets(offer))
}

function offerClickUrl(offer) {
	return offer.objectiveUrl.replace("[[clickid]]", "${CLICK_ID}");
}

function offerNative(offer) {
	return {
		id: `ntv-${offer.id}`,
		native: {
			title: offer.appTitle,
			short_title: offer.appTitle,
			data_assets: offerDataAssets(offer),
			image_assets: offerImageAssets(offer),
			video_assets: offerVideoAssets(offer),
		}
	}
}

function convertCreatives(results, cr) {
	switch (cr.mimeType) {
		case "image/jpeg":
			let dims = (cr.dimensions || "0x0").split("x");
			let w = parseInt(dims[0]);
			let h = parseInt(dims[1]);
			let replacements = {
				source: cr.previewUrl,
				click_trackers: [],
				impression_trackers: [],
			}
			banners.TEMPLATES.map(t => {
				results.push({
					id: cr.id,
					full_screen: t.full_screen,
					banner: {
						width: w,
						height: h,
						type: t.type,
						expand: rtb.NO_EXPAND,
						source: _.template(t.tpl)(replacements),
						api: t.api,
						mimes: t.mimes
					},
					fullscreen: t.name.includes('fullscreen'),
					client_config: {
						preview: cr.previewUrl,
						source: cr.previewUrl,
						format: t.name.replace('image_', '').replace('_fullscreen', ''),
					}
				});
			})
			break;
		default:
			break;
	}
	return results;
}

function osFilter(os) {
	switch (os.toLowerCase()) {
		case "ios":
			return ["android"];
			break;
		case "android":
			return ["ios"];
			break;
		default:
			return [];
			break;
	}
}

function offerCountries(result, cc) {
	const c = countries[cc];
	if (c != null) {
		result.push(c.alpha2);
		result.push(c.alpha3);
	} else {
		result.push(cc);
	}
	return result
}

function offerToCampain(max_bidding_price, max_cost_per_hour,
	baseline_price_cpm) {
	max_bidding_price = parseFloat(max_bidding_price) || MAX_BIDDING_PRICE
	max_cost_per_hour = parseFloat(max_cost_per_hour) || MAX_COST_PER_HOUR
	baseline_price_cpm = parseFloat(baseline_price_cpm) || BASELINE_PRICE
	max_bidding_price = Math.max(max_bidding_price, baseline_price_cpm)

	return function(offer) {
		return {
			id: offer.id,
			name: offer.name,
			click_url: offerClickUrl(offer),
			creatives: offer.creatives.reduce(convertCreatives, [offerNative(offer)]),
			bidding: {
				currency: "USD",
				traffic_types: {
					app: 1.5,
					site: 1.0,

				},
				max_price: max_bidding_price,
				max_cost_per_hour: max_cost_per_hour,
				baseline_price_cpm: baseline_price_cpm,
			},
			targeting: {
				device: {
					require_device: true,
					require_device_id: true,
					blocked_oses: osFilter(offer.targetPlatform),
				},
				location: {
					required: true,
					require_country: true,
					countries: {
						allow: offer.targetedCountries.reduce(offerCountries, []),
						deny_empty: true,
					}
				}
			}
		}
	}
}

exports.index = function*(apikey, max_bidding_price, max_cost_per_hour,
	baseline_price_cpm) {
	const indexUrl = `${MINIMOB_FEED_URL}?apikey=${apikey}`;
	const feed = yield get(indexUrl);
	const fullFeed = yield feed.map(o => get(`${indexUrl}&id=${o.id}`));
	const campaigns = fullFeed.map(offerToCampain(max_bidding_price,
		max_cost_per_hour, baseline_price_cpm));
	return campaigns;
}

if (require.main === module) {
	const APIKEY = process.argv[2];
	co(exports.index(APIKEY))
		.then(campaigns => {
			console.log(JSON.stringify({
				campaigns
			}));
			process.exit();
		})
		.catch(err => {
			console.error(err);
			process.exit(1);
		})
}
