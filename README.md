# Shared content initiative

An initiative to allow `Sharers` to **share links to content** (articles, books, musics, photos, videos, paintings, educational content, applications, creations and advices of all sorts) and the conditions associated such as:

- the price or reward for `Consumers` to consume the content.
- the price or reward for `Agents` to share the content.
- metas: locale, location, tags, license...

All that shared content is stored in a **decentralized open database** and anyone can run its node, **connected to the others**.

<a href="https://github.com/ztrev/shared-content-initiative"><img alt="release" src="https://img.shields.io/github/release/ztrev/shared-content-initiative.svg?style=flat" /></a>
<a href="https://github.com/ztrev/shared-content-initiative/blob/master/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT_License-blue.svg?style=flat" /></a>

## Why this project?

> « The Internet is free, but this comes at a cost. »

### I wouldn't pay for a Google search.

I mean, who would?

Google (and others) can only propose their "free services" because some people are willing to pay to stand out from the Internet hubbub, ie. pay for ads. When someone sees an ad, you can think of it as a kind of fee.

So what?

This model is working quite well to keep some services and content free, but it has its perks: it became a war to get the best of your attention span and your data, leading to the spread of adblockers.

Moreover not everyone is Google and lots of people struggle to monetize their blogs, musics, photos, videos, educational content, applications, creations and advices of all sorts... without giving a big share to intermediaries and fearing to annoy their fans.

### What could be made better?

In an ideal world:

- Ads should not be imposed (`Consumers` could pay their fees the way they want: sharing the content for example or making micro-payments).
- Ads should be displayed according to the preferences of the `Consumer`.
- Ads should be relevant and always displayed at the right time in a non-invasive way, without compromising on data privacy.
- Usefulness on the Internet should be rewarded.
- All that system should be automatic for `Consumers` and very discrete.

But we're not there yet.

Our first step is to help advertizers and publishers to get in touch in a more transparent way by creating an open database of paid and paying content. The aim is to allow other models to emerge.

### Technically speaking what is this project?

- **An open database**: shared content is stored in elasticsearch databases, ready to be searched.
- **An API to share content**: the server are running on Node.js (+ Micro) and expose an API to share content.
- **P2P server nodes**: nodes are connected together with Socket.io to synchronize their content.
- **Anonymous**: content is shared along with an ECDSA public key, so you can later prove that you sent it.

### What can I share?

See [complete model](https://github.com/ztrev/shared-content-initiative/blob/master/src/model/shared.js).

Examples:

- **A blog article**: a blogger writes an article, he can specify that `Consumers` have to pay $0.05 to read it, and reward $0.01 to `Agents` for each `Consumer` they bring in.
- **A photo**: a photographer takes a photo, then shares it for free.
- **An article content**: an independent journalist writes an article: she could sell it to a media for $2000 (and make it free for `Consumers`, letting the choice to the media for their own pricing)
- **A video ad**: an advertizer could reward $0.01 to `Consumers` and $0.01 to `Agents`.
- ...

### What this project is not handling

- Arrangement between the parties (could be handled by a smart contract or a centralised system)
- Reputation of the parties

## Getting started

If you don't already have Docker, see https://docs.docker.com/install/ to install it.

### How to try it out locally

1.  Run the node

```shell
$ docker run -p 5423:5423 -e NODE_ENV=development -e discovery.type=single-node --rm -it ztrev/shared-content-initiative
```

2.  Open `http://localhost:5423/is-up` to see if the server is running and if the database is connected (you should see `{"success":true,"isDatabaseConnected":true}`).

3.  See [client examples](https://github.com/ztrev/shared-content-initiative/blob/master/examples) to see how to add shared content.

### In production

- Your node will be connected to the network
- Data will be kept between restarts

```shell
$ docker volume create shared-content-volume
$ # Replace "localhost" by your external IP address or hostname and "5424" by your favorite port number
$ docker run -p 5424:5423 -e HOST=localhost:5424 -e discovery.type=single-node -v shared-content-volume:/usr/share/elasticsearch/data --name shared-content-initiative --rm -d ztrev/shared-content-initiative
```
