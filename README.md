# Sykes Owner Calendar

A web service offering your [Sykes Cottages](https://www.sykescottages.co.uk) property bookings as a calendar.

It uses the [iCalendar](https://en.wikipedia.org/wiki/ICalendar) standard, which is supported by many different calendar applications such as Outlook, Apple Calendar, Google Calendar.

## Getting Started

[This article](https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device) does a good job at describing the steps for subscribing to a calendar with a few apps.

The URL for the bookings calendar is as follows:

```
https://sykes-owner-calendar.vercel.app/bookings/[property-id]?email=[email]&password=[password]
```

- `property-id` is the unique identifier for your property which can be found from the properties dropdown on the [Bookings](https://www.sykescottages.co.uk/owner/bookings) page
- `email` is the email of your Sykes account
- `password` is the password of your Sykes account

> **WARNING: Giving credentials to a stranger is not advisable!** <br><br> This service requires your credentials in order to authenticate on the website and retrieve your bookings, and there's no way around it. The code itself doesn't do anything malicious and I do not have malicious intentions. <br><br> Use at your own discretion.
