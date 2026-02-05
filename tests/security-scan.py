#!/usr/bin/env python3
"""
Security Scan Script for Avatar System
Performs comprehensive security assessment
"""

import asyncio
import aiohttp
import ssl
import socket
import subprocess
import json
import time
import argparse
from urllib.parse import urlparse, urljoin
from typing import List, Dict, Any, Optional
import re

class SecurityScanner:
    def __init__(self, target_url: str):
        self.target_url = target_url.rstrip('/')
        self.parsed_url = urlparse(self.target_url)
        self.results = []
        self.vulnerabilities = []
        self.info_gathering = {}

    async def scan_security_headers(self):
        """Scan for security headers"""
        print("🔒 Scanning security headers...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.target_url) as response:
                    headers = response.headers
                    
                    security_headers = {
                        'Content-Security-Policy': headers.get('Content-Security-Policy'),
                        'X-Frame-Options': headers.get('X-Frame-Options'),
                        'X-Content-Type-Options': headers.get('X-Content-Type-Options'),
                        'X-XSS-Protection': headers.get('X-XSS-Protection'),
                        'Strict-Transport-Security': headers.get('Strict-Transport-Security'),
                        'Referrer-Policy': headers.get('Referrer-Policy'),
                        'Permissions-Policy': headers.get('Permissions-Policy')
                    }
                    
                    missing_headers = []
                    for header, value in security_headers.items():
                        if not value:
                            missing_headers.append(header)
                    
                    if missing_headers:
                        self.vulnerabilities.append({
                            "type": "missing_security_headers",
                            "severity": "medium",
                            "description": f"Missing security headers: {', '.join(missing_headers)}",
                            "recommendation": "Implement missing security headers"
                        })
                    else:
                        print("✅ All critical security headers present")
                    
                    self.info_gathering['security_headers'] = security_headers
                    
        except Exception as e:
            print(f"❌ Error scanning security headers: {e}")

    async def scan_open_ports(self):
        """Scan for open ports"""
        print("🔍 Scanning open ports...")
        
        common_ports = [22, 80, 443, 3000, 8080, 8443, 5432, 6379, 27017]
        open_ports = []
        
        host = self.parsed_url.hostname
        
        for port in common_ports:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(2)
                    result = s.connect_ex((host, port))
                    if result == 0:
                        open_ports.append(port)
                        print(f"   Port {port} is open")
            except:
                pass
        
        self.info_gathering['open_ports'] = open_ports
        
        # Check for unnecessary open ports
        if 22 in open_ports:
            self.vulnerabilities.append({
                "type": "ssh_exposed",
                "severity": "high",
                "description": "SSH port (22) is exposed to the internet",
                "recommendation": "Restrict SSH access to specific IP ranges or use VPN"
            })

    async def scan_ssl_configuration(self):
        """Scan SSL/TLS configuration"""
        print("🔐 Scanning SSL/TLS configuration...")
        
        if self.parsed_url.scheme != 'https':
            print("⚠️ Not using HTTPS - skipping SSL scan")
            self.vulnerabilities.append({
                "type": "no_https",
                "severity": "critical",
                "description": "Application is not using HTTPS",
                "recommendation": "Implement SSL/TLS encryption"
            })
            return
        
        try:
            hostname = self.parsed_url.hostname
            port = self.parsed_url.port or 443
            
            # Get SSL certificate
            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    
                    # Check certificate validity
                    self.info_gathering['ssl_certificate'] = {
                        'subject': dict(x[0] for x in cert['subject']),
                        'issuer': dict(x[0] for x in cert['issuer']),
                        'not_before': cert['notBefore'],
                        'not_after': cert['notAfter'],
                        'version': cert['version'],
                        'serial_number': cert['serialNumber']
                    }
                    
                    self.info_gathering['ssl_cipher'] = {
                        'name': cipher[0],
                        'version': cipher[1],
                        'bits': cipher[2]
                    }
                    
                    print(f"✅ SSL Certificate: {dict(x[0] for x in cert['subject'])}")
                    print(f"✅ Cipher: {cipher[0]} {cipher[1]} ({cipher[2]} bits)")
        
        except Exception as e:
            print(f"❌ Error scanning SSL configuration: {e}")
            self.vulnerabilities.append({
                "type": "ssl_configuration_error",
                "severity": "high",
                "description": f"SSL configuration error: {e}",
                "recommendation": "Fix SSL/TLS configuration"
            })

    async def scan_api_endpoints(self):
        """Scan for exposed API endpoints"""
        print("🔌 Scanning API endpoints...")
        
        common_endpoints = [
            '/api/health',
            '/api/users',
            '/api/admin',
            '/api/config',
            '/api/keys',
            '/.env',
            '/wp-admin',
            '/admin',
            '/phpmyadmin'
        ]
        
        vulnerable_endpoints = []
        
        async with aiohttp.ClientSession() as session:
            for endpoint in common_endpoints:
                try:
                    url = urljoin(self.target_url, endpoint)
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        if response.status in [200, 403]:
                            vulnerable_endpoints.append({
                                "endpoint": endpoint,
                                "status": response.status,
                                "exposed": response.status == 200
                            })
                            print(f"   Found endpoint: {endpoint} (Status: {response.status})")
                except:
                    pass
        
        if vulnerable_endpoints:
            self.vulnerabilities.append({
                "type": "exposed_api_endpoints",
                "severity": "medium",
                "description": f"Found {len(vulnerable_endpoints)} potentially exposed endpoints",
                "details": vulnerable_endpoints,
                "recommendation": "Secure API endpoints with proper authentication"
            })
        
        self.info_gathering['exposed_endpoints'] = vulnerable_endpoints

    async def scan_injection_vulnerabilities(self):
        """Test for SQL injection and XSS vulnerabilities"""
        print("🚨 Scanning for injection vulnerabilities...")
        
        # Test payloads
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT NULL,NULL,NULL --"
        ]
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>"
        ]
        
        vulnerable_params = []
        
        async with aiohttp.ClientSession() as session:
            # Test SQL injection
            for payload in sql_payloads:
                try:
                    url = f"{self.target_url}/api/search?q={payload}"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        content = await response.text()
                        
                        # Look for SQL error patterns
                        sql_errors = [
                            "SQL syntax", "mysql_fetch", "ORA-", "Microsoft OLE DB",
                            "PostgreSQL query failed", "Warning: pg_"
                        ]
                        
                        for error in sql_errors:
                            if error.lower() in content.lower():
                                vulnerable_params.append({
                                    "type": "sql_injection",
                                    "parameter": "q",
                                    "payload": payload,
                                    "error": error
                                })
                                print(f"   Potential SQL injection found with payload: {payload}")
                                break
                
                except:
                    pass
            
            # Test XSS
            for payload in xss_payloads:
                try:
                    url = f"{self.target_url}/api/search?q={payload}"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        content = await response.text()
                        
                        if payload in content:
                            vulnerable_params.append({
                                "type": "xss",
                                "parameter": "q", 
                                "payload": payload
                            })
                            print(f"   Potential XSS found with payload: {payload}")
                
                except:
                    pass
        
        if vulnerable_params:
            self.vulnerabilities.append({
                "type": "injection_vulnerabilities",
                "severity": "critical",
                "description": f"Found {len(vulnerable_params)} injection vulnerabilities",
                "details": vulnerable_params,
                "recommendation": "Implement proper input validation and parameterized queries"
            })
        
        self.info_gathering['injection_tests'] = vulnerable_params

    async def scan_rate_limiting(self):
        """Test rate limiting effectiveness"""
        print("⏱️ Testing rate limiting...")
        
        request_count = 0
        failed_requests = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                # Send rapid requests
                for i in range(50):
                    try:
                        start_time = time.time()
                        async with session.get(
                            f"{self.target_url}/api/avatar/create",
                            json={"prompt": "test"},
                            timeout=aiohttp.ClientTimeout(total=5)
                        ) as response:
                            request_count += 1
                            if response.status == 429:
                                failed_requests += 1
                                print(f"   Rate limit activated after {request_count} requests")
                                break
                    
                    except Exception as e:
                        failed_requests += 1
                        if "connection" in str(e).lower():
                            print(f"   Connection refused after {request_count} requests")
                            break
        
        except Exception as e:
            print(f"❌ Error testing rate limiting: {e}")
        
        if request_count > 30 and failed_requests == 0:
            self.vulnerabilities.append({
                "type": "no_rate_limiting",
                "severity": "high",
                "description": f"Made {request_count} requests without rate limiting",
                "recommendation": "Implement rate limiting on API endpoints"
            })
        else:
            print("✅ Rate limiting appears to be working")
        
        self.info_gathering['rate_limiting_test'] = {
            "total_requests": request_count,
            "failed_requests": failed_requests,
            "rate_limit_detected": failed_requests > 0
        }

    async def scan_directory_listing(self):
        """Test for directory listing vulnerabilities"""
        print("📁 Testing for directory listing...")
        
        vulnerable_dirs = []
        
        common_dirs = [
            '/uploads/',
            '/logs/',
            '/backup/',
            '/temp/',
            '/static/',
            '/assets/',
            '/images/',
            '/avatars/'
        ]
        
        async with aiohttp.ClientSession() as session:
            for directory in common_dirs:
                try:
                    url = urljoin(self.target_url, directory)
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        content = await response.text()
                        
                        # Check for directory listing patterns
                        listing_patterns = [
                            "Index of /",
                            "Directory Listing",
                            "Parent Directory",
                            "<pre>",  # Common directory listing format
                        ]
                        
                        for pattern in listing_patterns:
                            if pattern in content:
                                vulnerable_dirs.append({
                                    "directory": directory,
                                    "status": response.status,
                                    "pattern_found": pattern
                                })
                                print(f"   Directory listing found: {directory}")
                                break
                
                except:
                    pass
        
        if vulnerable_dirs:
            self.vulnerabilities.append({
                "type": "directory_listing",
                "severity": "medium",
                "description": f"Found {len(vulnerable_dirs)} directories with listing enabled",
                "details": vulnerable_dirs,
                "recommendation": "Disable directory listing for sensitive directories"
            })
        
        self.info_gathering['directory_listing'] = vulnerable_dirs

    async def run_security_scan(self):
        """Execute complete security scan"""
        print(f"🛡️ Starting security scan for {self.target_url}")
        print("="*80)
        
        start_time = time.time()
        
        # Run all scans
        await self.scan_security_headers()
        await self.scan_open_ports()
        await self.scan_ssl_configuration()
        await self.scan_api_endpoints()
        await self.scan_injection_vulnerabilities()
        await self.scan_rate_limiting()
        await self.scan_directory_listing()
        
        scan_duration = time.time() - start_time
        
        # Generate report
        self.generate_security_report(scan_duration)

    def generate_security_report(self, scan_duration: float):
        """Generate comprehensive security report"""
        print("\n" + "="*80)
        print("🔒 SECURITY SCAN COMPLETE")
        print("="*80)
        
        # Categorize vulnerabilities by severity
        critical = [v for v in self.vulnerabilities if v["severity"] == "critical"]
        high = [v for v in self.vulnerabilities if v["severity"] == "high"]
        medium = [v for v in self.vulnerabilities if v["severity"] == "medium"]
        low = [v for v in self.vulnerabilities if v["severity"] == "low"]
        
        print(f"⏱️ Scan Duration: {scan_duration:.2f} seconds")
        print(f"🚨 Total Vulnerabilities: {len(self.vulnerabilities)}")
        print(f"   Critical: {len(critical)}")
        print(f"   High: {len(high)}")
        print(f"   Medium: {len(medium)}")
        print(f"   Low: {len(low)}")
        
        # Show critical and high vulnerabilities
        if critical or high:
            print(f"\n🚨 CRITICAL & HIGH SEVERITY VULNERABILITIES:")
            for vuln in critical + high:
                print(f"   • {vuln['type'].upper()} ({vuln['severity'].upper()})")
                print(f"     {vuln['description']}")
                print(f"     Recommendation: {vuln['recommendation']}")
                print()
        
        # Generate security score
        total_vulnerabilities = len(self.vulnerabilities)
        if total_vulnerabilities == 0:
            security_score = 100
        else:
            severity_weights = {"critical": 10, "high": 5, "medium": 2, "low": 1}
            risk_score = sum(severity_weights.get(v["severity"], 1) for v in self.vulnerabilities)
            security_score = max(0, 100 - risk_score)
        
        print(f"🎯 SECURITY SCORE: {security_score}/100")
        
        if security_score >= 90:
            grade = "EXCELLENT"
        elif security_score >= 75:
            grade = "GOOD"
        elif security_score >= 60:
            grade = "ACCEPTABLE"
        else:
            grade = "NEEDS IMPROVEMENT"
        
        print(f"🏆 SECURITY GRADE: {grade}")
        
        # Save detailed report
        timestamp = int(time.time())
        report = {
            "scan_summary": {
                "target": self.target_url,
                "scan_duration": scan_duration,
                "total_vulnerabilities": total_vulnerabilities,
                "security_score": security_score,
                "security_grade": grade,
                "scan_completed_at": time.strftime("%Y-%m-%d %H:%M:%S UTC")
            },
            "vulnerabilities": {
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low
            },
            "information_gathering": self.info_gathering
        }
        
        report_file = f"security-scan-report-{timestamp}.json"
        
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        # Recommendations
        if critical or high:
            print(f"\n💡 IMMEDIATE ACTIONS REQUIRED:")
            print("   1. Address all critical and high severity vulnerabilities")
            print("   2. Implement proper input validation and sanitization")
            print("   3. Enable all security headers")
            print("   4. Configure proper rate limiting")
            print("   5. Secure API endpoints with authentication")
        
        print("="*80)

def main():
    parser = argparse.ArgumentParser(description="Avatar System Security Scanner")
    parser.add_argument("--target", required=True, help="Target URL (e.g., https://avatar-platform.com)")
    
    args = parser.parse_args()
    
    # Validate target URL
    if not args.target.startswith(('http://', 'https://')):
        print("❌ Target URL must start with http:// or https://")
        return
    
    # Run security scan
    scanner = SecurityScanner(args.target)
    
    try:
        asyncio.run(scanner.run_security_scan())
    except KeyboardInterrupt:
        print("\n⚠️ Security scan interrupted by user")
    except Exception as e:
        print(f"\n❌ Security scan failed: {e}")

if __name__ == "__main__":
    main()