#!/usr/bin/env python3
"""
Load Testing Script for Avatar System
Tests scalability and performance under load
"""

import asyncio
import aiohttp
import time
import statistics
import argparse
import json
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

class LoadTester:
    def __init__(self, target_url: str, users: int, duration: int):
        self.target_url = target_url.rstrip('/')
        self.users = users
        self.duration = duration
        self.results = []
        self.start_time = None

    async def test_avatar_creation(self, session: aiohttp.ClientSession, user_id: int):
        """Test avatar creation endpoint"""
        start_time = time.time()
        
        try:
            async with session.post(
                f"{self.target_url}/api/avatar/create",
                json={
                    "prompt": f"Professional avatar for user {user_id}",
                    "gender": "male",
                    "age": 30,
                    "ethnicity": "white",
                    "style": "professional",
                    "quality": "high"
                },
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                data = await response.json()
                end_time = time.time()
                
                return {
                    "user_id": user_id,
                    "endpoint": "avatar_create",
                    "status_code": response.status,
                    "response_time": end_time - start_time,
                    "success": response.status == 200,
                    "data": data
                }
        except Exception as e:
            end_time = time.time()
            return {
                "user_id": user_id,
                "endpoint": "avatar_create",
                "status_code": 0,
                "response_time": end_time - start_time,
                "success": False,
                "error": str(e)
            }

    async def test_video_render(self, session: aiohttp.ClientSession, user_id: int, avatar_id: str):
        """Test video rendering endpoint"""
        start_time = time.time()
        
        try:
            async with session.post(
                f"{self.target_url}/api/video/render",
                json={
                    "avatarId": avatar_id,
                    "script": "Hello world from user " + str(user_id),
                    "duration": 30,
                    "quality": "high",
                    "resolution": "1080p"
                },
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                data = await response.json()
                end_time = time.time()
                
                return {
                    "user_id": user_id,
                    "endpoint": "video_render",
                    "status_code": response.status,
                    "response_time": end_time - start_time,
                    "success": response.status == 200,
                    "data": data
                }
        except Exception as e:
            end_time = time.time()
            return {
                "user_id": user_id,
                "endpoint": "video_render",
                "status_code": 0,
                "response_time": end_time - start_time,
                "success": False,
                "error": str(e)
            }

    async def test_marketplace_search(self, session: aiohttp.ClientSession, user_id: int):
        """Test marketplace search endpoint"""
        start_time = time.time()
        
        try:
            async with session.get(
                f"{self.target_url}/api/marketplace/search",
                params={
                    "query": "professional avatar",
                    "limit": 20,
                    "offset": 0
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                data = await response.json()
                end_time = time.time()
                
                return {
                    "user_id": user_id,
                    "endpoint": "marketplace_search",
                    "status_code": response.status,
                    "response_time": end_time - start_time,
                    "success": response.status == 200,
                    "data": data
                }
        except Exception as e:
            end_time = time.time()
            return {
                "user_id": user_id,
                "endpoint": "marketplace_search",
                "status_code": 0,
                "response_time": end_time - start_time,
                "success": False,
                "error": str(e)
            }

    async def user_simulation(self, user_id: int):
        """Simulate user behavior"""
        async with aiohttp.ClientSession() as session:
            while time.time() - self.start_time < self.duration:
                # Test avatar creation (first time only)
                avatar_result = await self.test_avatar_creation(session, user_id)
                self.results.append(avatar_result)
                
                if avatar_result["success"]:
                    avatar_id = avatar_result["data"].get("avatarId", f"test-avatar-{user_id}")
                    
                    # Test video rendering
                    render_result = await self.test_video_render(session, user_id, avatar_id)
                    self.results.append(render_result)
                
                # Test marketplace search
                search_result = await self.test_marketplace_search(session, user_id)
                self.results.append(search_result)
                
                # Random delay between requests
                await asyncio.sleep(2)

    async def run_load_test(self):
        """Execute load test with specified users"""
        print(f"🚀 Starting load test: {self.users} users for {self.duration} seconds")
        print(f"🎯 Target: {self.target_url}")
        
        self.start_time = time.time()
        
        # Create concurrent user simulations
        tasks = []
        for user_id in range(1, self.users + 1):
            task = asyncio.create_task(self.user_simulation(user_id))
            tasks.append(task)
        
        # Wait for all tasks to complete or timeout
        try:
            await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=self.duration)
        except asyncio.TimeoutError:
            print("⏰ Test duration reached, stopping simulations...")
        
        # Generate report
        self.generate_report()

    def generate_report(self):
        """Generate comprehensive load test report"""
        if not self.results:
            print("❌ No results to report")
            return

        # Calculate metrics by endpoint
        endpoints = {}
        for result in self.results:
            endpoint = result["endpoint"]
            if endpoint not in endpoints:
                endpoints[endpoint] = []
            endpoints[endpoint].append(result)
        
        report = {
            "test_summary": {
                "target": self.target_url,
                "users": self.users,
                "duration": self.duration,
                "total_requests": len(self.results),
                "test_completed_at": time.strftime("%Y-%m-%d %H:%M:%S UTC")
            },
            "endpoint_metrics": {}
        }
        
        for endpoint, results in endpoints.items():
            successful = [r for r in results if r["success"]]
            failed = [r for r in results if not r["success"]]
            
            if successful:
                response_times = [r["response_time"] for r in successful]
                metrics = {
                    "total_requests": len(results),
                    "successful_requests": len(successful),
                    "failed_requests": len(failed),
                    "success_rate": (len(successful) / len(results)) * 100,
                    "avg_response_time": statistics.mean(response_times),
                    "min_response_time": min(response_times),
                    "max_response_time": max(response_times),
                    "p50_response_time": statistics.median(response_times),
                    "p95_response_time": sorted(response_times)[int(len(response_times) * 0.95)],
                    "p99_response_time": sorted(response_times)[int(len(response_times) * 0.99)]
                }
            else:
                metrics = {
                    "total_requests": len(results),
                    "successful_requests": 0,
                    "failed_requests": len(failed),
                    "success_rate": 0,
                    "avg_response_time": 0,
                    "min_response_time": 0,
                    "max_response_time": 0,
                    "p50_response_time": 0,
                    "p95_response_time": 0,
                    "p99_response_time": 0
                }
            
            report["endpoint_metrics"][endpoint] = metrics
        
        # Overall metrics
        all_successful = [r for r in self.results if r["success"]]
        if all_successful:
            all_response_times = [r["response_time"] for r in all_successful]
            report["overall_metrics"] = {
                "total_requests": len(self.results),
                "successful_requests": len(all_successful),
                "failed_requests": len(self.results) - len(all_successful),
                "success_rate": (len(all_successful) / len(self.results)) * 100,
                "avg_response_time": statistics.mean(all_response_times),
                "min_response_time": min(all_response_times),
                "max_response_time": max(all_response_times),
                "p50_response_time": statistics.median(all_response_times),
                "p95_response_time": sorted(all_response_times)[int(len(all_response_times) * 0.95)],
                "p99_response_time": sorted(all_response_times)[int(len(all_response_times) * 0.99)],
                "requests_per_second": len(self.results) / self.duration
            }
        
        # Performance evaluation
        report["performance_evaluation"] = self.evaluate_performance(report)
        
        # Save report
        timestamp = int(time.time())
        report_file = f"load-test-report-{timestamp}.json"
        
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2, default=str)
        
        # Print summary
        self.print_summary(report, report_file)

    def evaluate_performance(self, report: Dict) -> Dict:
        """Evaluate performance against benchmarks"""
        evaluation = {
            "overall_grade": "UNKNOWN",
            "grades": {},
            "recommendations": []
        }
        
        # Benchmarks
        benchmarks = {
            "success_rate": {"excellent": 99.9, "good": 99.0, "acceptable": 95.0},
            "avg_response_time": {"excellent": 0.5, "good": 1.0, "acceptable": 2.0},
            "p95_response_time": {"excellent": 1.0, "good": 2.0, "acceptable": 5.0},
            "requests_per_second": {"excellent": 100, "good": 50, "acceptable": 25}
        }
        
        if "overall_metrics" in report:
            metrics = report["overall_metrics"]
            
            # Success rate
            success_rate = metrics["success_rate"]
            if success_rate >= benchmarks["success_rate"]["excellent"]:
                evaluation["grades"]["success_rate"] = "EXCELLENT"
            elif success_rate >= benchmarks["success_rate"]["good"]:
                evaluation["grades"]["success_rate"] = "GOOD"
            elif success_rate >= benchmarks["success_rate"]["acceptable"]:
                evaluation["grades"]["success_rate"] = "ACCEPTABLE"
            else:
                evaluation["grades"]["success_rate"] = "POOR"
                evaluation["recommendations"].append("Improve error handling and system reliability")
            
            # Response time
            avg_response_time = metrics["avg_response_time"]
            if avg_response_time <= benchmarks["avg_response_time"]["excellent"]:
                evaluation["grades"]["response_time"] = "EXCELLENT"
            elif avg_response_time <= benchmarks["avg_response_time"]["good"]:
                evaluation["grades"]["response_time"] = "GOOD"
            elif avg_response_time <= benchmarks["avg_response_time"]["acceptable"]:
                evaluation["grades"]["response_time"] = "ACCEPTABLE"
            else:
                evaluation["grades"]["response_time"] = "POOR"
                evaluation["recommendations"].append("Optimize response times and reduce latency")
            
            # Throughput
            rps = metrics["requests_per_second"]
            if rps >= benchmarks["requests_per_second"]["excellent"]:
                evaluation["grades"]["throughput"] = "EXCELLENT"
            elif rps >= benchmarks["requests_per_second"]["good"]:
                evaluation["grades"]["throughput"] = "GOOD"
            elif rps >= benchmarks["requests_per_second"]["acceptable"]:
                evaluation["grades"]["throughput"] = "ACCEPTABLE"
            else:
                evaluation["grades"]["throughput"] = "POOR"
                evaluation["recommendations"].append("Increase system capacity and scaling")
        
        # Overall grade
        grades = list(evaluation["grades"].values())
        if all(g in ["EXCELLENT", "GOOD"] for g in grades):
            evaluation["overall_grade"] = "EXCELLENT"
        elif all(g in ["EXCELLENT", "GOOD", "ACCEPTABLE"] for g in grades):
            evaluation["overall_grade"] = "GOOD"
        elif all(g != "POOR" for g in grades):
            evaluation["overall_grade"] = "ACCEPTABLE"
        else:
            evaluation["overall_grade"] = "POOR"
        
        return evaluation

    def print_summary(self, report: Dict, report_file: str):
        """Print formatted summary to console"""
        print("\n" + "="*80)
        print("🎯 LOAD TEST SUMMARY")
        print("="*80)
        
        summary = report["test_summary"]
        print(f"🎪 Target: {summary['target']}")
        print(f"👥 Users: {summary['users']}")
        print(f"⏱️ Duration: {summary['duration']} seconds")
        print(f"📊 Total Requests: {summary['total_requests']}")
        
        if "overall_metrics" in report:
            metrics = report["overall_metrics"]
            print(f"\n📈 OVERALL PERFORMANCE:")
            print(f"   Success Rate: {metrics['success_rate']:.2f}%")
            print(f"   Avg Response Time: {metrics['avg_response_time']:.2f}s")
            print(f"   P95 Response Time: {metrics['p95_response_time']:.2f}s")
            print(f"   P99 Response Time: {metrics['p99_response_time']:.2f}s")
            print(f"   Requests/Second: {metrics['requests_per_second']:.2f}")
        
        print(f"\n🏆 PERFORMANCE GRADE: {report['performance_evaluation']['overall_grade']}")
        
        if report['performance_evaluation']['recommendations']:
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in report['performance_evaluation']['recommendations']:
                print(f"   • {rec}")
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        print("="*80)

def main():
    parser = argparse.ArgumentParser(description="Avatar System Load Tester")
    parser.add_argument("--target", required=True, help="Target URL (e.g., https://avatar-platform.com)")
    parser.add_argument("--users", type=int, default=10, help="Number of concurrent users (default: 10)")
    parser.add_argument("--duration", type=int, default=300, help="Test duration in seconds (default: 300)")
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.target.startswith(('http://', 'https://')):
        print("❌ Target URL must start with http:// or https://")
        return
    
    if args.users < 1 or args.users > 1000:
        print("❌ Users must be between 1 and 1000")
        return
    
    if args.duration < 10 or args.duration > 3600:
        print("❌ Duration must be between 10 and 3600 seconds")
        return
    
    # Run load test
    tester = LoadTester(args.target, args.users, args.duration)
    
    try:
        asyncio.run(tester.run_load_test())
    except KeyboardInterrupt:
        print("\n⚠️ Load test interrupted by user")
    except Exception as e:
        print(f"\n❌ Load test failed: {e}")

if __name__ == "__main__":
    main()