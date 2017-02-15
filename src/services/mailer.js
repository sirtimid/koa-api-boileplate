'use strict'

import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import htmlToText from 'html-to-text'
import nodemailer from 'nodemailer'
import config from 'config'

const templates_dir = path.resolve(__dirname, '../views/emails')

function generateContent(options) {
	options.template = options.template || 'general'

	let data = _.extend(options.data, {
		app_name: config.get('app_name'),
		app_url: config.get('app_url'),
		year: new Date().getFullYear()
	})

	// read the proper email body template
	return new Promise((resolve, reject) => {
		fs.readFile(templates_dir + '/' + options.template + '.html', {encoding: 'utf8'}, (err, file_content) => {
			if (err) { reject(err) }

			// insert user-specific data into the email
			let compiled = _.template(file_content, { interpolate : /{{([\s\S]+?)}}/g })
				, html_content = compiled(data)
				, text_content

			// generate a plain-text version of the same email
			text_content = htmlToText.fromString(html_content)

			resolve({
				html: html_content,
				text: text_content
			})
		})
	})
}

const mailer = {
	send: options => {
		// create reusable transporter object using the default SMTP transport
		let transporter = nodemailer.createTransport(config.get('mail.transport'))
		let app_name = config.get('app_name')

		return generateContent(options)
		.then(mail_options => {
			// set generated options
			mail_options = _.extend(mail_options, {
				from: config.get('mail.from'),
				to: options.to,
				subject: `${app_name} - ${options.subject}`
			})

			if(options.cc){
				mail_options.cc = (''+options.cc).split(/(\s*,?\s*)+/)
			}

			return new Promise((resolve, reject) => {
				// send mail with defined transport object
				transporter.sendMail(mail_options, (err, info) => {
					if (err) { reject(err) }
					resolve(info)
				})
			})
		})
	}
}

export default mailer