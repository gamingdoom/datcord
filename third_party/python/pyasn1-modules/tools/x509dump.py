#!/usr/bin/env python
#
# This file is part of pyasn1-modules software.
#
# Copyright (c) 2005-2017, Ilya Etingof <etingof@gmail.com>
# License: http://pyasn1.sf.net/license.html
#
# Read ASN.1/PEM X.509 certificates on stdin, parse each into plain text,
# then build substrate from it
#
from pyasn1.codec.der import decoder, encoder
from pyasn1_modules import rfc2459, pem
import sys

if len(sys.argv) != 1:
    print("""Usage:
$ cat CACertificate.pem | %s
$ cat userCertificate.pem | %s""" % (sys.argv[0], sys.argv[0]))
    sys.exit(-1)

certType = rfc2459.Certificate()

certCnt = 0

while True:
    idx, substrate = pem.readPemBlocksFromFile(
        sys.stdin, ('-----BEGIN CERTIFICATE-----',
                    '-----END CERTIFICATE-----')
    )
    if not substrate:
        break

    cert, rest = decoder.decode(substrate, asn1Spec=certType)

    if rest:
        substrate = substrate[:-len(rest)]

    print(cert.prettyPrint())

    assert encoder.encode(cert) == substrate, 'cert recode fails'

    certCnt += 1

print('*** %s PEM cert(s) de/serialized' % certCnt)
