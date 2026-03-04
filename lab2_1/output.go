package main

import (
	"bufio"
	"fmt"
	"os"
)

type cond struct {
	T    []int
	F    []string
	used bool
	New  int
}

var n int
var m int
var q int
var order int
var A []cond
var A1 []cond

func dfs(i int) {
	A[i].used, A[i].New = true, order
	order++
	for j := 0; j < m; j++ {
		if !(A[A[i].T[j]].used) {
			dfs(A[i].T[j])
		}
	}
}
func main() {
	stdin := bufio.NewReader(os.Stdin)
	fmt.Fscan(stdin, &n, &m, &q)
	A = make([]cond, n)
	A1 = make([]cond, n)
	for i := 0; i < n; i++ {
		A[i].T = make([]int, m)
		A1[i].T = make([]int, m)
		for j := 0; j < m; j++ {
			fmt.Fscan(stdin, &A[i].T[j])
		}
	}
	for i := 0; i < n; i++ {
		A[i].F = make([]string, m)
		A1[i].F = make([]string, m)
		for j := 0; j < m; j++ {
			fmt.Fscan(stdin, &A[i].F[j])
		}
	}
	dfs(q)
	for i := 0; i < n; i++ {
		for j := 0; j < m; j++ {
			A1[A[i].New].T[j], A1[A[i].New].F[j] = A[A[i].T[j]].New, A[i].F[j]
		}
	}
	fmt.Println(order)
	fmt.Println(m)
	fmt.Println("0")
	for i := 0; i < order; i++ {
		for j := 0; j < m; j++ {
			fmt.Printf("%d ", A1[i].T[j])
		}
		fmt.Println()
	}
	for i := 0; i < order; i++ {
		for j := 0; j < m; j++ {
			fmt.Printf("%s ", A1[i].F[j])
		}
		fmt.Println()
	}
}
