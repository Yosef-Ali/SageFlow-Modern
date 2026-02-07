# Peachtree Data Extractor using Actian Zen
# This container reads Btrieve/Peachtree .DAT files using official ODBC drivers

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    file \
    odbcinst \
    unixodbc \
    unixodbc-dev \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python ODBC
RUN pip3 install pyodbc pandas

# Create directories
RUN mkdir -p /app /data /output

WORKDIR /app

# Copy extraction scripts
COPY extract.py /app/
COPY extract.sh /app/
COPY btrieve_reader.py /app/
RUN chmod +x /app/extract.sh

# The Actian Zen client needs to be downloaded manually due to licensing
# User must download from: https://esd.actian.com/product/Zen_PSQL
# And place the .tar.gz file in this directory before building

# Placeholder for Actian Zen installation
# COPY actian-zen-client.tar.gz /tmp/
# RUN tar -xzf /tmp/actian-zen-client.tar.gz -C /opt/

CMD ["python3", "/app/extract.py"]
