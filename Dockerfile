################################################################################
# Elasticsearch
################################################################################

FROM docker.elastic.co/elasticsearch/elasticsearch:6.3.0

################################################################################
# Node.js and Yarn
################################################################################

RUN curl --silent --location https://rpm.nodesource.com/setup_10.x | bash - \
  && yum -y install nodejs

RUN curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo \
  && yum -y install yarn

################################################################################
# Application sources
################################################################################

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./
RUN yarn install --production
COPY src src/

EXPOSE 5423

################################################################################
# Run application
################################################################################

COPY start.sh /
CMD [ "/start.sh" ]
